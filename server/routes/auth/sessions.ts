import { protectedProcedure } from '@/trpc.js'
import { Session } from '@/database/entity/Session.js'
import { toTrpcError } from '../_shared/errors.js'

export const sessionsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    try {
      const sessions = await Session.find({
        where: { user: { id: ctx.user.id }, valid: true },
        order: { createdAt: 'DESC' },
        relations: { bot: true },
      })

      return {
        sessions: sessions.map((s) => ({
          id: s.id,
          deviceName: s.deviceName,
          botId: s.bot?.id,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
        })),
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not fetch sessions')
    }
  })
