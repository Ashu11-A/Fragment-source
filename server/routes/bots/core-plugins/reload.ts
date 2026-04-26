import { z } from 'zod'
import { callCorePlugin } from '@/services/corePluginBridge.js'
import { protectedProcedure } from '@/trpc.js'
import { throwIfCoreError } from './shared.js'

export const reload = protectedProcedure
  .input(z.object({
    botId: z.number().int().positive(),
    filePath: z.string().min(1).max(4096),
  }))
  .mutation(async ({ ctx, input }) => {
    const result = await callCorePlugin(
      ctx.req.log,
      ctx.user,
      input.botId,
      { action: 'reload', filePath: input.filePath },
    )
    if (!result.ok) throwIfCoreError(result)
    return {
      message: 'Plugin recarregado',
      data: { pluginName: result.pluginName, filePath: result.filePath },
    }
  })
