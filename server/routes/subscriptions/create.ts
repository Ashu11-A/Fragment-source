import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Bot } from '@/database/entity/Bot.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { Role } from '@/database/enums.js'
import { protectedProcedure } from '@/trpc.js'

export const create = protectedProcedure
  .input(z.object({
    botId: z.number().int().positive(),
    pluginIds: z.array(z.number().int().positive()).min(1),
    startAt: z.string(),
    expireAt: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    const isAdmin = ctx.user.role === Role.Administrator
    const bot = await Bot.findOneBy({
      id: input.botId,
      user: isAdmin ? undefined : { id: ctx.user.id },
    })
    if (!bot) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bot not found or not yours' })

    const plugins = await Promise.all(
      input.pluginIds.map(async (pluginId) => {
        const plugin = await Plugin.findOneBy({ id: pluginId })
        if (!plugin) throw new TRPCError({ code: 'NOT_FOUND', message: `Plugin with ID ${pluginId} not found` })
        return plugin
      }),
    )

    const subscription = await Subscription.create({
      user: ctx.user,
      bot,
      plugins,
      active: true,
      startAt: input.startAt,
      expireAt: input.expireAt,
    }).save()

    return { message: 'Subscription created successfully', data: subscription }
  })
