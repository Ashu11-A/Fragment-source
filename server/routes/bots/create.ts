import { z } from 'zod'
import { Bot } from '@/database/entity/Bot.js'
import { protectedProcedure } from '@/trpc.js'

export const create = protectedProcedure
  .input(z.object({
    name: z.string().max(256),
    enabled: z.boolean().default(true),
  }))
  .mutation(async ({ input, ctx }) => {
    const bot = Bot.create({
      name: input.name,
      user: ctx.user,
      enabled: input.enabled,
      plugins: [],
      subscriptions: [],
    })

    await bot.save()

    return { message: 'Bot created successfully!', data: { bot, user: ctx.user } }
  })
