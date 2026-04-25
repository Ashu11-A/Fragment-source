import jwt from 'jsonwebtoken'
import moment from 'moment'
import type { FastifyReply } from 'fastify'
import { Auth } from '../database/entity/Auth.js'
import type { User } from '../database/entity/User.js'
import {
  jwtSignExpiresInSeconds,
  payloadExpireSeconds,
  resolveAccessExpireMs,
  resolveRefreshExpireMs,
} from './jwtExpiryConfig.js'

export const getCookieOptions = (expirationDate: Date) => ({
  path: '/',
  expires: expirationDate,
  httpOnly: true,
  secure: Boolean(process.env.PRODUCTION),
  domain: process.env.PRODUCTION ? new URL(process.env.FRONT_END_URL!).hostname : undefined,
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

export async function issueAuthSession (user: User, res: FastifyReply): Promise<IssuedSessionPayload> {
  const tokenSecret = process.env.JWT_TOKEN
  const refreshSecret = process.env.REFRESH_TOKEN
  if (!tokenSecret || !refreshSecret) {
    throw new Error('JWT_TOKEN or REFRESH_TOKEN is undefined')
  }

  const expiresTokenMs = resolveAccessExpireMs()
  const expiresRefreshMs = resolveRefreshExpireMs()

  const expirationTokenDate = new Date(Date.now() + expiresTokenMs)
  const expirationRefreshDate = new Date(Date.now() + expiresRefreshMs)

  const data = { id: user.id, uuid: user.uuid, username: user.username, email: user.email }

  const accessToken = jwt.sign(data, tokenSecret, {
    expiresIn: jwtSignExpiresInSeconds(expiresTokenMs),
    algorithm: 'HS512',
  })

  const refreshToken = jwt.sign(data, refreshSecret, {
    expiresIn: jwtSignExpiresInSeconds(expiresRefreshMs),
    algorithm: 'HS512',
  })

  await Auth.create({
    accessToken,
    refreshToken,
    user,
    expireAt: moment(expirationRefreshDate.toISOString()).format('YYYY-MM-DD HH:mm:ss.SSS'),
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
