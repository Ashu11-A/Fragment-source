import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Bot } from '@/database/entity/Bot.js'
import { Role } from '@/database/enums.js'
import { protectedProcedure } from '@/trpc.js'

export const update = protectedProcedure
  .input(z.object({
    id: z.number().int().positive(),
    name: z.string().max(256).optional(),
    enabled: z.boolean().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const isAdmin = ctx.user.role === Role.Administrator
    const bot = await Bot.findOneBy({
      id: input.id,
      user: isAdmin ? undefined : { id: ctx.user.id },
    })
    if (!bot) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bot not found, maybe it\'s not yours!' })

    if (input.name) bot.name = input.name
    if (input.enabled !== undefined) bot.enabled = input.enabled

    await bot.save()

    return { message: 'Bot changed successfully!', data: bot }
  })
