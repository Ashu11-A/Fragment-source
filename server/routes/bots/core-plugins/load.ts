import { z } from 'zod'
import { callCorePlugin } from '@/services/corePluginBridge.js'
import { protectedProcedure } from '@/trpc.js'
import { throwIfCoreError } from './shared.js'

export const load = protectedProcedure
  .input(z.object({
    botId: z.number().int().positive(),
    filePath: z.string().min(1).max(4096),
  }))
  .mutation(async ({ ctx, input }) => {
    const result = await callCorePlugin(
      ctx.req.log,
      ctx.user,
      input.botId,
      { action: 'load', filePath: input.filePath },
    )
    if (!result.ok) throwIfCoreError(result)
    return {
      message: 'Plugin carregado',
      data: { pluginName: result.pluginName, filePath: result.filePath },
    }
  })
