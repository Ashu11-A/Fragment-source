import { TRPCError } from '@trpc/server'
import jwt from 'jsonwebtoken'
import { publicProcedure } from '@/trpc.js'
import { Session } from '@/database/entity/Session.js'
import { User } from '@/database/entity/User.js'
import { issueAuthSession } from '@/security/session.js'
import type { JWTData } from '@/types/jwt.js'
import { toTrpcError } from '../_shared/errors.js'

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

export const refreshProcedure = publicProcedure
  .mutation(async ({ ctx }) => {
    try {
      const refreshToken = readRefreshTokenFromRequest(ctx.req)
      if (!refreshToken)
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Refresh token is required.',
        })

      const secret = process.env.REFRESH_TOKEN
      if (!secret) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Refresh token secret is not configured.',
      })

      const session = await Session.findOne({
        where: { refreshToken, valid: true },
        relations: { user: true },
      })

      if (!session) throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Refresh token is invalid.',
      })

      const decoded = jwt.verify(refreshToken, secret, { algorithms: ['HS512'] }) as JWTData
      if (!decoded?.id) throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Refresh token payload is invalid.',
      })

      const user = await User.findOne({ where: { id: decoded.id } })
      if (!user) throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User no longer exists.',
      })

      session.valid = false
      await session.save()

      return issueAuthSession(user, ctx.res, ctx.req)
    } catch (error) {
      throw toTrpcError(error, 'Could not refresh session')
    }
  })
