import jwt from 'jsonwebtoken'
import type { IncomingHttpHeaders } from 'http'
import { Auth } from '../database/entity/Auth.js'
import { User } from '../database/entity/User.js'

type HandshakeAuth = { token?: unknown }

/**
 * Extract JWT access token from Socket.IO handshake (auth payload, Authorization header, or Bearer cookie).
 */
export function getAccessTokenFromHandshake(headers: IncomingHttpHeaders, auth: HandshakeAuth): string | undefined {
  const rawAuth = auth?.token
  if (typeof rawAuth === 'string' && rawAuth.length > 0) return rawAuth.trim()

  const authz = headers.authorization
  if (typeof authz === 'string') {
    const v = authz.replace(/^Bearer\s+/i, '').trim()
    if (v.length > 0) return v
  }

  const cookieHeader = headers.cookie
  if (typeof cookieHeader === 'string') {
    for (const part of cookieHeader.split(';')) {
      const idx = part.indexOf('=')
      if (idx === -1) continue
      const k = part.slice(0, idx).trim()
      const v = part.slice(idx + 1).trim()
      if (k === 'Bearer' && v.length > 0) {
        try {
          return decodeURIComponent(v)
        } catch {
          return v
        }
      }
    }
  }

  return undefined
}

/**
 * Validate token and return the authenticated user, or `null`.
 */
export async function authenticateUserFromAccessToken(token: string): Promise<User | null> {
  try {
    const secret = process.env.JWT_TOKEN
    if (!secret) return null

    const auth = await Auth.findOneBy({ accessToken: token })
    if (!auth?.valid) return null

    const userData = jwt.verify(token, secret, { algorithms: ['HS512'] })
    if (typeof userData !== 'object' || userData === null) return null
    if (!('id' in userData) || !('uuid' in userData)) return null

    const { id, uuid } = userData as { id: number; uuid: string }
    const user = await User.findOneBy({ id })
    if (!user || user.uuid !== uuid) return null

    return user
  } catch {
    return null
  }
}
