import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Bot } from '@/database/entity/Bot.js'
import { protectedProcedure } from '@/trpc.js'

export const get = protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const bot = await Bot.findOneBy({ id: input.id })
    if (!bot) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bot not found!' })

    return { message: 'Request completed successfully!', data: bot }
  })
