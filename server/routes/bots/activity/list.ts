import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { assertOwnership, fetchLogs } from '@/services/activity.js'
import { protectedProcedure } from '@/trpc.js'

export const list = protectedProcedure
  .input(z.object({
    botId: z.number().int().positive(),
    limit: z.number().int().min(1).max(500).default(50),
  }))
  .query(async ({ input, ctx }) => {
    if (!await assertOwnership(ctx.user, input.botId)) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Bot not found, maybe it\'s not yours!' })
    }

    const rows = await fetchLogs(input.botId, input.limit)
    const data = rows.map((row) => ({
      id: row.id,
      botId: row.botId,
      level: row.level,
      category: row.category,
      message: row.message,
      display: row.display,
      metadata: row.metadata,
      source: row.source,
      correlationId: row.correlationId,
      createdAt: row.createdAt.toISOString(),
    }))
    return { message: 'Activity loaded', data }
  })
