import { z } from 'zod'
import { callCorePlugin } from '@/services/corePluginBridge.js'
import { protectedProcedure } from '@/trpc.js'
import { throwIfCoreError } from './shared.js'

export const unload = protectedProcedure
  .input(z.object({
    botId: z.number().int().positive(),
    pluginName: z.string().min(1).max(256),
  }))
  .mutation(async ({ ctx, input }) => {
    const result = await callCorePlugin(
      ctx.req.log,
      ctx.user,
      input.botId,
      { action: 'unload', pluginName: input.pluginName },
    )
    if (!result.ok) throwIfCoreError(result)
    return { message: 'Plugin desativado', data: { pluginName: result.pluginName } }
  })
