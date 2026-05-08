import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { callCorePlugin } from '@/services/corePluginBridge.js'
import { toTrpcError } from '../../_shared/errors.js'
import { ensureCorePluginSuccess } from './shared.js'

const reloadCorePluginSchema = z.object({
  botId: z.number().int().positive(),
  filePath: z.string().min(1).max(4096),
})

export const reloadCorePluginProcedure = protectedProcedure
  .input(reloadCorePluginSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const result = await callCorePlugin(ctx.req.log, ctx.user, input.botId, {
        action: 'reload',
        filePath: input.filePath,
      })
      ensureCorePluginSuccess(result)

      return {
        pluginName: result.pluginName,
        filePath: result.filePath ?? input.filePath,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not reload core plugin')
    }
  })
