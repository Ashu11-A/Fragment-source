import jwt from 'jsonwebtoken'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { Session } from '@/database/entity/Session.js'
import type { User } from '@/database/entity/User.js'
import {
  jwtSignExpiresInSeconds,
  payloadExpireSeconds,
  resolveAccessExpireMs,
  resolveRefreshExpireMs,
} from '@/security/jwtExpiryConfig.js'

function resolveCookieDomain(): string | undefined {
  const explicit = String(process.env.COOKIE_DOMAIN ?? '').trim()
  if (explicit.length > 0) return explicit

  const frontEndUrl = process.env.FRONT_END_URL?.trim()
  if (frontEndUrl && frontEndUrl.length > 0) {
    try {
      return new URL(frontEndUrl).hostname
    } catch { /* malformed URL */ }
  }

  return undefined
}

export const getCookieOptions = (expirationDate: Date) => ({
  path: '/',
  expires: expirationDate,
  httpOnly: true,
  secure: String(process.env.PRODUCTION) === 'true',
  domain: String(process.env.PRODUCTION) === 'true' ? resolveCookieDomain() : undefined,
})

export type IssuedSessionPayload = {
  message: string
  data: {
    accessToken: {
      token: string
      expireDate: Date
      expireSeconds: number
    }
    refreshToken: {
      token: string
      expireDate: Date
      expireSeconds: number
    }
  }
}

export async function issueAuthSession(
  user: User,
  res: FastifyReply,
  _req?: FastifyRequest,
): Promise<IssuedSessionPayload> {
  const tokenSecret = process.env.JWT_TOKEN
  const refreshSecret = process.env.REFRESH_TOKEN
  if (!tokenSecret || !refreshSecret) {
    throw new Error('JWT_TOKEN or REFRESH_TOKEN is undefined')
  }

  const expiresTokenMs = resolveAccessExpireMs()
  const expiresRefreshMs = resolveRefreshExpireMs()

  const expirationTokenDate = new Date(Date.now() + expiresTokenMs)
  const expirationRefreshDate = new Date(Date.now() + expiresRefreshMs)

  const payload = { id: user.id, username: user.username, email: user.email }

  const accessToken = jwt.sign(payload, tokenSecret, {
    expiresIn: jwtSignExpiresInSeconds(expiresTokenMs),
    algorithm: 'HS512',
  })

  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: jwtSignExpiresInSeconds(expiresRefreshMs),
    algorithm: 'HS512',
  })

  await Session.create({
    accessToken,
    refreshToken,
    user,
    expiresAt: expirationRefreshDate,
    deviceName: null,
  }).save()

  res.setCookie('Bearer', accessToken, getCookieOptions(expirationTokenDate))
  res.setCookie('Refresh', refreshToken, getCookieOptions(expirationRefreshDate))

  return {
    message: 'Login successful',
    data: {
      accessToken: {
        token: accessToken,
        expireDate: expirationTokenDate,
        expireSeconds: payloadExpireSeconds(expiresTokenMs),
      },
      refreshToken: {
        token: refreshToken,
        expireDate: expirationRefreshDate,
        expireSeconds: payloadExpireSeconds(expiresRefreshMs),
      },
    },
  }
}
