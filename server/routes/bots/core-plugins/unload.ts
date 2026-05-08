import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { callCorePlugin } from '@/services/corePluginBridge.js'
import { toTrpcError } from '../../_shared/errors.js'
import { ensureCorePluginSuccess } from './shared.js'

const unloadCorePluginSchema = z.object({
  botId: z.number().int().positive(),
  pluginName: z.string().min(1).max(200),
})

export const unloadCorePluginProcedure = protectedProcedure
  .input(unloadCorePluginSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const result = await callCorePlugin(ctx.req.log, ctx.user, input.botId, {
        action: 'unload',
        pluginName: input.pluginName,
      })
      ensureCorePluginSuccess(result)

      return { pluginName: result.pluginName ?? input.pluginName }
    } catch (error) {
      throw toTrpcError(error, 'Could not unload core plugin')
    }
  })
