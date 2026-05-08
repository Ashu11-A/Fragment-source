import { protectedProcedure } from '@/trpc.js'
import { Session } from '@/database/entity/Session.js'
import { toTrpcError } from '../_shared/errors.js'

export const logoutAllProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    try {
      await Session.update({ user: { id: ctx.user.id }, valid: true }, { valid: false })

      ctx.res.clearCookie('Bearer', { path: '/' })
      ctx.res.clearCookie('Refresh', { path: '/' })

      return { message: 'All sessions logged out' }
    } catch (error) {
      throw toTrpcError(error, 'Could not log out all sessions')
    }
  })
