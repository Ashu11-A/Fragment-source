import type { FastifyRequest } from 'fastify'
import { protectedProcedure } from '@/trpc.js'
import { Session } from '@/database/entity/Session.js'
import { toTrpcError } from '../_shared/errors.js'

function getAccessToken(req: FastifyRequest): string | undefined {
  const bearer = req.headers.authorization
  if (bearer?.startsWith('Bearer ')) return bearer.slice(7)
  return req.cookies['Bearer']
}

export const logoutProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    try {
      const token = getAccessToken(ctx.req)
      if (token) {
        await Session.update({ accessToken: token }, { valid: false })
      }

      ctx.res.clearCookie('Bearer', { path: '/' })
      ctx.res.clearCookie('Refresh', { path: '/' })

      return { message: 'Logout successful' }
    } catch (error) {
      throw toTrpcError(error, 'Could not complete logout')
    }
  })
