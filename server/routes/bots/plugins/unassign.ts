import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { toTrpcError } from '../../_shared/errors.js'
import { findBotForUser } from '../shared.js'

const unassignBotPluginSchema = z.object({
  botId: z.number().int().positive(),
  pluginId: z.number().int().positive(),
})

export const unassignBotPluginProcedure = protectedProcedure
  .input(unassignBotPluginSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const bot = await findBotForUser(input.botId, ctx.user, ['plugins'])
      bot.plugins = bot.plugins.filter((plugin) => plugin.id !== input.pluginId)
      await bot.save()

      return {
        botId: bot.id,
        pluginId: input.pluginId,
        assigned: false,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not unassign plugin from bot')
    }
  })
