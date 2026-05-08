import jwt from 'jsonwebtoken'
import { TRPCError } from '@trpc/server'
import {
  exchangeCode,
  fetchUser,
  buildAuthorizeUrl,
  assertRedirectUri,
  getAllowedRedirectUris,
  isLoopbackUri,
} from 'discord-oauth'

export type {
  DiscordTokenResponse,
  DiscordUser as DiscordUserMe,
  OAuthStatePayload as DiscordOAuthStatePayload,
} from 'discord-oauth'

// Re-export helpers used by server routes
export { buildAuthorizeUrl as buildDiscordAuthorizeUrl, getAllowedRedirectUris as getAllowedDiscordRedirectUris, isLoopbackUri }

const STATE_ALG: jwt.Algorithm = 'HS512'

function requireOAuthStateSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET
  if (!secret?.trim()) {
    throw new Error(
      'OAUTH_STATE_SECRET is required for Discord OAuth. Set a dedicated secret (do not reuse JWT_TOKEN).',
    )
  }
  return secret.trim()
}

export class Discord {
  signState(redirectUri: string): string {
    return jwt.sign(
      { typ: 'discord_oauth', redirect_uri: redirectUri },
      requireOAuthStateSecret(),
      { expiresIn: '10m', algorithm: STATE_ALG },
    )
  }

  verifyState(token: string): { redirect_uri: string; typ: 'discord_oauth' } {
    try {
      const decoded = jwt.verify(token, requireOAuthStateSecret(), { algorithms: [STATE_ALG] }) as {
        typ?: unknown
        redirect_uri?: unknown
      }
      if (decoded.typ !== 'discord_oauth' || typeof decoded.redirect_uri !== 'string' || !decoded.redirect_uri) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid OAuth state',
        })
      }
      return { typ: 'discord_oauth', redirect_uri: decoded.redirect_uri }
    } catch (err) {
      if (err instanceof TRPCError) throw err
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid or expired OAuth state',
      })
    }
  }

  assertRedirectUri(redirectUri: string): void {
    try {
      assertRedirectUri(redirectUri)
    } catch (err) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: err instanceof Error ? err.message : 'redirect_uri is not allowed',
      })
    }
  }

  async exchangeCode(code: string, redirectUri: string): Promise<import('discord-oauth').DiscordTokenResponse> {
    try {
      return await exchangeCode(code, redirectUri)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const code2 = message.includes('not configured') ? 'INTERNAL_SERVER_ERROR' as const : 'BAD_REQUEST' as const
      throw new TRPCError({
        code: code2,
        message,
      })
    }
  }

  async fetchUser(discordAccessToken: string): Promise<import('discord-oauth').DiscordUser> {
    try {
      return await fetchUser(discordAccessToken)
    } catch (err) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

export const discord = new Discord()
