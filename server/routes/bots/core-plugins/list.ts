import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { callCorePlugin } from '@/services/corePluginBridge.js'
import { toTrpcError } from '../../_shared/errors.js'
import { ensureCorePluginSuccess } from './shared.js'

const listCorePluginsSchema = z.object({
  botId: z.number().int().positive(),
})

export const listCorePluginsProcedure = protectedProcedure
  .input(listCorePluginsSchema)
  .query(async ({ input, ctx }) => {
    try {
      const result = await callCorePlugin(ctx.req.log, ctx.user, input.botId, { action: 'list' })
      ensureCorePluginSuccess(result)

      return (result.plugins ?? []).map((plugin) => ({
        pluginName: plugin.pluginName,
        filePath: plugin.filePath,
        version: plugin.version,
        description: plugin.description,
        loaded: plugin.loaded,
      }))
    } catch (error) {
      throw toTrpcError(error, 'Could not list core plugins')
    }
  })
