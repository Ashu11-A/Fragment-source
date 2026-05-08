import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { billing } from '@/services/Billing.js'
import { nodeBridge } from '@/services/NodeBridge.js'
import { botRuntime } from '@/services/BotRuntime.js'
import { baseUrl } from '@/singletons.js'
import { toTrpcError } from '../../_shared/errors.js'
import { findBotForUser } from '../shared.js'

const installBotPluginSchema = z.object({
  botId: z.number().int().positive(),
  pluginId: z.number().int().positive(),
})

export const installBotPluginProcedure = protectedProcedure
  .input(installBotPluginSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const bot = await findBotForUser(input.botId, ctx.user, ['plugins', 'node'])
      const plugin = await Plugin.findOne({ where: { id: input.pluginId, published: true } })

      if (!plugin) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Plugin not found or unpublished.',
      })

      if (plugin.price !== 0) throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only free plugins can be installed directly.',
      })

      if (!bot.plugins.find((assignedPlugin) => assignedPlugin.id === plugin.id)) {
        const { allowed, limit, current } = await billing.canAssignPlugin(bot.id)
        if (!allowed) throw new TRPCError({
          code: 'FORBIDDEN',
          message: `You have reached the maximum number of free plugins (${limit}) for this bot. You currently have ${current} free plugin(s) assigned. Remove a plugin first.`,
        })
        bot.plugins.push(plugin)
        await bot.save()
      }

      const nodes = bot.node ? [bot.node] : []
      const nodeResults: Array<{ nodeId: number; ok: boolean; details?: string }> = []

      for (const node of nodes) {
        try {
          const containerName = botRuntime.containerName(bot.id, node.id)
          const pluginDeployUrl = `${baseUrl}/api/node/${node.id}/plugins/${plugin.id}/deploy`

          const result = await nodeBridge.installPlugin(ctx.req.log, node.id, {
            botId: bot.id,
            containerName,
            pluginDeployUrl,
            envs: [
              ...await botRuntime.collectEnvVars(bot.id),
              ...await botRuntime.collectDefaultEnvVars(bot.id),
            ],
          })

          nodeResults.push({
            nodeId: node.id,
            ok: result.ok,
            details: result.details,
          })
        } catch (error) {
          nodeResults.push({
            nodeId: node.id,
            ok: false,
            details: error instanceof Error ? error.message : 'Failed to install plugin on node.',
          })
        }
      }

      const allOk = nodeResults.every((r) => r.ok)
      const someOk = nodeResults.some((r) => r.ok)

      if (!allOk && !someOk && nodeResults.length > 0) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to install plugin on all nodes.',
      })

      return {
        botId: bot.id,
        pluginId: plugin.id,
        installed: true,
        nodeResults,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not install plugin on bot')
    }
  })
