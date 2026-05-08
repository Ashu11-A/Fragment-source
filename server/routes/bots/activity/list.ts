import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { toTrpcError } from '../../_shared/errors.js'
import { activity } from '@/services/Activity.js'

const listBotActivitySchema = z.object({
  botId: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
})

export const listBotActivityProcedure = protectedProcedure
  .input(listBotActivitySchema)
  .query(async ({ input, ctx }) => {
    try {
      const owns = await activity.assertOwnership(ctx.user, input.botId)
      if (!owns)
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bot not found or not owned by you.',
        })

      const logs = await activity.fetchLogs(input.botId, input.limit)
      return logs.map(activity.toPayload)
    } catch (error) {
      throw toTrpcError(error, 'Could not list bot activity')
    }
  })
