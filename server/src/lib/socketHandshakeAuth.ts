import type { IncomingHttpHeaders } from 'http'
import { validateAccessToken } from '@/security/validateToken.js'
import type { User } from '@/database/entity/User.js'
import type { HandshakeAuth } from '@/types/socketAuth.js'

export function getAccessTokenFromHandshake(headers: IncomingHttpHeaders, auth: HandshakeAuth): string | undefined {
  const rawAuth = auth?.token
  if (typeof rawAuth === 'string' && rawAuth.length > 0) return rawAuth.trim()

  const authz = headers.authorization
  if (typeof authz === 'string') {
    const value = authz.replace(/^Bearer\s+/i, '').trim()
    if (value.length > 0) return value
  }

  const cookieHeader = headers.cookie
  if (typeof cookieHeader === 'string') {
    for (const part of cookieHeader.split(';')) {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex === -1) continue
      const key = part.slice(0, separatorIndex).trim()
      const value = part.slice(separatorIndex + 1).trim()
      if (key === 'Bearer' && value.length > 0) {
        try {
          return decodeURIComponent(value)
        } catch {
          return value
        }
      }
    }
  }

  return undefined
}

export async function authenticateUserFromAccessToken(token: string): Promise<User | null> {
  return validateAccessToken(token)
}
