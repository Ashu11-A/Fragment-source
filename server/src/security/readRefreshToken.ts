import type { FastifyRequest } from 'fastify'

const REFRESH_SCHEME = /^Refresh\s+/i

/**
 * Lê o refresh token do cookie httpOnly ou do header `Authorization: Refresh <jwt>`.
 */
export function readRefreshTokenFromRequest(request: FastifyRequest): string | undefined {
  const fromCookie = request.cookies['Refresh']
  if (typeof fromCookie === 'string') {
    const trimmedCookie = fromCookie.trim()
    if (trimmedCookie.length > 0) return trimmedCookie
  }

  const authz = request.headers.authorization
  if (typeof authz !== 'string') return undefined

  const trimmedHeader = authz.trim()
  if (REFRESH_SCHEME.test(trimmedHeader)) {
    return trimmedHeader.replace(REFRESH_SCHEME, '').trim()
  }

  return undefined
}
