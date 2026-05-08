import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { toTrpcError } from '../../_shared/errors.js'
import { findBotForUser } from '../shared.js'

const listBotPluginsSchema = z.object({
  botId: z.number().int().positive(),
})

export const listBotPluginsProcedure = protectedProcedure
  .input(listBotPluginsSchema)
  .query(async ({ input, ctx }) => {
    try {
      const bot = await findBotForUser(input.botId, ctx.user, ['plugins'])

      return {
        botId: bot.id,
        plugins: bot.plugins,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not list assigned plugins')
    }
  })
