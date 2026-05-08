import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Bot } from '@/database/entity/Bot.js'
import { Role } from '@/database/enums.js'
import { Fastify } from '@/infra/fastify.js'
import { toTrpcError } from '../_shared/errors.js'

const statusBotsSchema = z.object({
  botIds: z.array(z.number().int().positive()).min(1).max(200),
})

export const statusBotsProcedure = protectedProcedure
  .input(statusBotsSchema)
  .query(async ({ input, ctx }) => {
    try {
      const bots = await Bot.find({
        where: input.botIds.map((botId) => ({
          id: botId,
          ...(ctx.user.role === Role.Administrator ? {} : { user: { id: ctx.user.id } }),
        })),
      })

      const allowedIds = new Set(bots.map((bot) => bot.id))
      const statuses: Record<number, boolean> = {}
      // Os bots conectam ao namespace /core; rooms vivem no adapter desse namespace
      const coreNamespace = Fastify.server?.io?.of('/core')

      for (const botId of input.botIds) {
        if (!allowedIds.has(botId)) {
          statuses[botId] = false
          continue
        }

        const room = coreNamespace?.adapter?.rooms?.get(`bot:${botId}`)
        statuses[botId] = (room?.size ?? 0) > 0
      }

      return statuses
    } catch (error) {
      throw toTrpcError(error, 'Could not resolve bots status')
    }
  })
