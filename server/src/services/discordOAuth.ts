import jwt from 'jsonwebtoken'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

const STATE_ALG: jwt.Algorithm = 'HS512'

const discordTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string(),
})

const discordUserMeSchema = z.object({
  id: z.string().min(1),
  username: z.string(),
  global_name: z.string().nullable(),
  email: z.string().optional(),
  verified: z.boolean().optional(),
})

function requireOAuthStateSecret (): string {
  const secret = process.env.OAUTH_STATE_SECRET
  if (secret === undefined || secret === null || secret.trim() === '') {
    throw new Error(
      'OAUTH_STATE_SECRET is required for Discord OAuth. Set a dedicated secret (do not reuse JWT_TOKEN).',
    )
  }
  return secret.trim()
}

export type DiscordOAuthStatePayload = {
  redirect_uri: string
  typ: 'discord_oauth'
}

export function signDiscordOAuthState (redirect_uri: string): string {
  return jwt.sign(
    { typ: 'discord_oauth', redirect_uri } satisfies DiscordOAuthStatePayload,
    requireOAuthStateSecret(),
    { expiresIn: '10m', algorithm: STATE_ALG },
  )
}

export function verifyDiscordOAuthState (token: string): DiscordOAuthStatePayload {
  try {
    const decoded = jwt.verify(token, requireOAuthStateSecret(), { algorithms: [STATE_ALG] })
    const parsedPayload = z
      .object({
        typ: z.literal('discord_oauth'),
        redirect_uri: z.string().min(1),
      })
      .safeParse(decoded)

    if (!parsedPayload.success) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid OAuth state' })
    }

    return parsedPayload.data
  } catch (err) {
    if (err instanceof TRPCError) throw err
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired OAuth state' })
  }
}

export function getAllowedDiscordRedirectUris (): string[] {
  const list: string[] = []

  const rawEnv = process.env.DISCORD_ALLOWED_REDIRECT_URIS
  const raw = (typeof rawEnv === 'string' ? rawEnv : '').trim()
  if (raw.length > 0) {
    list.push(...raw.split(',').map((segment) => segment.trim()).filter((segment) => segment.length > 0))
  }

  // FRONT_END_URL é o fallback automático: deriva a URI canônica sem hardcode de portas.
  const frontEndUrl = process.env.FRONT_END_URL?.trim()
  if (frontEndUrl && frontEndUrl.length > 0) {
    try {
      const origin = new URL(frontEndUrl).origin
      list.push(`${origin}/login/discord/callback`)
    } catch { /* FRONT_END_URL inválida — ignorar */ }
  }

  return [...new Set(list)]
}

export function assertRedirectUriAllowed (redirect_uri: string): void {
  const allowed = getAllowedDiscordRedirectUris()
  if (!allowed.includes(redirect_uri)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'redirect_uri is not allowed',
    })
  }
}

export type DiscordTokenResponse = z.infer<typeof discordTokenResponseSchema>
export type DiscordUserMe = z.infer<typeof discordUserMeSchema>

async function parseJsonBody<T> (
  response: Response,
  schema: z.ZodType<T>,
  errorLabel: string,
): Promise<T> {
  const text = await response.text()
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(text) as unknown
  } catch {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `${errorLabel}: response is not valid JSON`,
    })
  }

  const result = schema.safeParse(parsedJson)
  if (!result.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `${errorLabel}: ${result.error.flatten().formErrors.join('; ') || 'schema mismatch'}`,
    })
  }
  return result.data
}

export async function exchangeDiscordCode (code: string, redirect_uri: string): Promise<DiscordTokenResponse> {
  const clientId = String(process.env.DISCORD_CLIENT_ID ?? '').trim()
  const clientSecret = String(process.env.DISCORD_CLIENT_SECRET ?? '').trim()
  if (clientId.length === 0 || clientSecret.length === 0) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Discord OAuth is not configured' })
  }

  const codeTrim = code.trim()
  const redirectTrim = redirect_uri.trim()
  if (codeTrim.length === 0 || redirectTrim.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing code or redirect_uri for Discord token exchange' })
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: codeTrim,
    redirect_uri: redirectTrim,
  })

  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: body.toString(),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Discord token exchange failed: ${errorText.slice(0, 200)}`,
    })
  }

  return parseJsonBody(res, discordTokenResponseSchema, 'Discord token response')
}

export async function fetchDiscordUserMe (discordAccessToken: string): Promise<DiscordUserMe> {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${discordAccessToken}` },
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Discord profile fetch failed: ${errorText.slice(0, 200)}`,
    })
  }
  return parseJsonBody(res, discordUserMeSchema, 'Discord user profile')
}

export function buildDiscordAuthorizeUrl (redirect_uri: string, state: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID
  if (clientId === undefined || clientId.trim() === '') {
    throw new Error('DISCORD_CLIENT_ID is not set')
  }

  const authorizeUrl = new URL('https://discord.com/api/oauth2/authorize')
  authorizeUrl.searchParams.set('client_id', clientId.trim())
  authorizeUrl.searchParams.set('redirect_uri', redirect_uri)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('scope', 'identify email')
  authorizeUrl.searchParams.set('state', state)
  return authorizeUrl.toString()
}
