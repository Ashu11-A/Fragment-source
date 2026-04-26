import { z } from 'zod'
import { callCorePlugin } from '@/services/corePluginBridge.js'
import { protectedProcedure } from '@/trpc.js'
import { throwIfCoreError } from './shared.js'

export const list = protectedProcedure
  .input(z.object({ botId: z.number().int().positive() }))
  .query(async ({ ctx, input }) => {
    const result = await callCorePlugin(ctx.req.log, ctx.user, input.botId, { action: 'list' })
    if (!result.ok) throwIfCoreError(result)
    return { message: 'ok', data: { plugins: result.plugins ?? [] } }
  })
