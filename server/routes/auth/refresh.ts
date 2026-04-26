import { TRPCError } from '@trpc/server'
import jwt from 'jsonwebtoken'
import moment from 'moment'
import { Auth } from '@/database/entity/Auth.js'
import { authTreeRepository } from '@/database/index.js'
import { getCookieOptions } from '@/security/session.js'
import { readRefreshTokenFromRequest } from '@/security/readRefreshToken.js'
import {
  jwtSignExpiresInSeconds,
  payloadExpireSeconds,
  resolveAccessExpireMs,
  resolveRefreshExpireMs,
} from '@/security/jwtExpiryConfig.js'
import type { JWTData } from '@/types/jwt.js'
import { publicProcedure } from '@/trpc.js'

export const refresh = publicProcedure
  .mutation(async ({ ctx }) => {
    const refreshSecret = process.env.REFRESH_TOKEN
    if (!refreshSecret) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'REFRESH_TOKEN is undefined!' })

    const tokenSecret = process.env.JWT_TOKEN
    if (!tokenSecret) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'JWT_TOKEN is undefined!' })

    const refreshTokenCookie = readRefreshTokenFromRequest(ctx.req)
    if (refreshTokenCookie === undefined || refreshTokenCookie.length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Refresh token cookie is undefined' })
    }

    const auth = await Auth.findOne({ where: { refreshToken: refreshTokenCookie } })
    if (!auth) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Authentication not found' })

    if (!auth.valid) {
      const ancestors = await authTreeRepository.findAncestors(auth)
      const descendants = await authTreeRepository.findDescendants(auth)
      const nodesToRemove = [...descendants, ...ancestors]
      await authTreeRepository.remove(nodesToRemove)
      await auth.remove()
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This token has already been used and all others will now be revoked!',
      })
    }

    let userData: JWTData
    try {
      userData = jwt.verify(refreshTokenCookie, refreshSecret, { algorithms: ['HS512'] }) as JWTData
    } catch {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' })
    }
    delete userData.exp
    delete userData.iat

    const expiresTokenMs = resolveAccessExpireMs()
    const expiresRefreshMs = resolveRefreshExpireMs()

    const expirationTokenDate = new Date(Date.now() + expiresTokenMs)
    const expirationRefreshDate = new Date(Date.now() + expiresRefreshMs)

    const newAccessToken = jwt.sign(userData, tokenSecret, {
      expiresIn: jwtSignExpiresInSeconds(expiresTokenMs),
      algorithm: 'HS512',
    })
    const newRefreshToken = jwt.sign(userData, refreshSecret, {
      expiresIn: jwtSignExpiresInSeconds(expiresRefreshMs),
      algorithm: 'HS512',
    })

    await Auth.create({
      parent: auth,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expireAt: moment(expirationRefreshDate.toISOString()).format('YYYY-MM-DD HH:mm:ss.SSS'),
      user: { id: userData.id },
    }).save()

    auth.valid = false
    await auth.save()

    ctx.res.setCookie('Bearer', newAccessToken, getCookieOptions(expirationTokenDate))
    ctx.res.setCookie('Refresh', newRefreshToken, getCookieOptions(expirationRefreshDate))

    return {
      message: 'Token refreshed successfully',
      data: {
        accessToken: {
          token: newAccessToken,
          expireDate: expirationTokenDate,
          expireSeconds: payloadExpireSeconds(expiresTokenMs),
        },
        refreshToken: {
          token: newRefreshToken,
          expireDate: expirationRefreshDate,
          expireSeconds: payloadExpireSeconds(expiresRefreshMs),
        },
      },
    }
  })
