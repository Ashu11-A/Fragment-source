import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Bot } from '@/database/entity/Bot.js'
import { Role } from '@/database/enums.js'
import { protectedProcedure } from '@/trpc.js'

export const deleteBotProcedure = protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    const isAdmin = ctx.user.role === Role.Administrator
    const bot = await Bot.findOne({
      where: {
        id: input.id,
        user: isAdmin ? undefined : { id: ctx.user.id },
      },
      relations: { subscriptions: true },
    })
    if (!bot) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bot not found, maybe it\'s not yours!' })

    await Promise.all(bot.subscriptions.map((subscription) => subscription.remove()))
    const removed = await bot.remove()

    return { message: 'Bot with your signature successfully removed!', data: removed }
  })
