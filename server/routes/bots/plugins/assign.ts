import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { billing } from '@/services/Billing.js'
import { toTrpcError } from '../../_shared/errors.js'
import { findBotForUser } from '../shared.js'

const assignBotPluginSchema = z.object({
  botId: z.number().int().positive(),
  pluginId: z.number().int().positive(),
})

export const assignBotPluginProcedure = protectedProcedure
  .input(assignBotPluginSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const bot = await findBotForUser(input.botId, ctx.user, ['plugins'])
      const plugin = await Plugin.findOne({ where: { id: input.pluginId, published: true } })

      if (!plugin) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Plugin not found or unpublished.',
        })
      }

      if (!bot.plugins.find((assignedPlugin) => assignedPlugin.id === plugin.id)) {
        if (plugin.price === 0) {
          const { allowed, limit, current } = await billing.canAssignPlugin(bot.id)
          if (!allowed) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: `You have reached the maximum number of free plugins (${limit}) for this bot. You currently have ${current} free plugin(s) assigned. Remove a plugin first.`,
            })
          }
        }
        bot.plugins.push(plugin)
        await bot.save()
      }

      return {
        botId: bot.id,
        pluginId: plugin.id,
        assigned: true,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not assign plugin to bot')
    }
  })
