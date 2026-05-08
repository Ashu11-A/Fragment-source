import { Bot } from '@/database/entity/Bot.js'
import { protectedProcedure } from '@/trpc.js'
import { z } from 'zod'
import { toTrpcError } from '../_shared/errors.js'
import { findBotForUser } from './shared.js'

const deleteBotSchema = z.object({
  id: z.number().int().positive(),
})

export const deleteBotProcedure = protectedProcedure
  .input(deleteBotSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const bot = await findBotForUser(input.id, ctx.user, ['nodes', 'plugins', 'user'])
      await Bot.delete({ id: bot.id })

      return bot
    } catch (error) {
      throw toTrpcError(error, 'Could not remove bot')
    }
  })
