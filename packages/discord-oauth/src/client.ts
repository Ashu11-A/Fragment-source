import { z } from 'zod'
import { discordTokenResponseSchema, discordUserSchema } from '@/types/index.js'
import type { DiscordTokenResponse, DiscordUser } from '@/types/index.js'

async function parseJsonBody<T>(
  response: Response,
  schema: z.ZodType<T>,
  errorLabel: string,
): Promise<T> {
  const text = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error(`${errorLabel}: response is not valid JSON`)
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`${errorLabel}: ${result.error.flatten().formErrors.join('; ') || 'schema mismatch'}`)
  }
  return result.data
}

export async function exchangeCode(code: string, redirectUri: string): Promise<DiscordTokenResponse> {
  const clientId = String(process.env.DISCORD_CLIENT_ID ?? '').trim()
  const clientSecret = String(process.env.DISCORD_CLIENT_SECRET ?? '').trim()
  if (clientId.length === 0 || clientSecret.length === 0) {
    throw new Error('Discord OAuth is not configured (missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET)')
  }

  const codeTrim = code.trim()
  const redirectTrim = redirectUri.trim()
  if (codeTrim.length === 0 || redirectTrim.length === 0) {
    throw new Error('Missing code or redirect_uri for Discord token exchange')
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
    throw new Error(`Discord token exchange failed: ${errorText.slice(0, 200)}`)
  }

  return parseJsonBody(res, discordTokenResponseSchema, 'Discord token response')
}

export async function fetchUser(discordAccessToken: string): Promise<DiscordUser> {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${discordAccessToken}` },
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Discord profile fetch failed: ${errorText.slice(0, 200)}`)
  }
  return parseJsonBody(res, discordUserSchema, 'Discord user profile')
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId?.trim()) throw new Error('DISCORD_CLIENT_ID is not set')

  const url = new URL('https://discord.com/api/oauth2/authorize')
  url.searchParams.set('client_id', clientId.trim())
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'identify email')
  url.searchParams.set('state', state)
  return url.toString()
}
