import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Bot } from '../database/entity/Bot.js'
import { Plugin } from '../database/entity/Plugin.js'
import { Subscription } from '../database/entity/Subscription.js'
import { repository } from '../database/index.js'
import { paginate, paginateSchema } from '../database/pagination.js'
import { Role } from '../database/enums.js'
import { protectedProcedure, adminProcedure, router } from '../trpc.js'

export const subscriptionsRouter = router({
  list: protectedProcedure
    .input(paginateSchema)
    .query(async ({ input, ctx }) => {
      const isAdmin = ctx.user.role === Role.Administrator

      const paginated = await paginate({
        repository: repository.subscription,
        page: input.page,
        pageSize: input.pageSize,
        interval: input.interval,
        day: input.day,
        orderBy: input.orderBy,
        orderDirection: input.orderDirection,
        user: isAdmin ? undefined : { id: ctx.user.id },
      })

      return { message: 'Subscriptions retrieved successfully', ...paginated }
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const isAdmin = ctx.user.role === Role.Administrator
      const subscription = await Subscription.findOne({
        where: {
          id: input.id,
          user: isAdmin ? undefined : { id: ctx.user.id },
        },
        relations: { user: true, bot: true, plugins: true },
      })
      if (!subscription) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subscription not found' })

      return { message: 'Subscription retrieved successfully', data: subscription }
    }),

  create: protectedProcedure
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
        input.pluginIds.map(async (id) => {
          const plugin = await Plugin.findOneBy({ id })
          if (!plugin) throw new TRPCError({ code: 'NOT_FOUND', message: `Plugin with ID ${id} not found` })
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
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const isAdmin = ctx.user.role === Role.Administrator
      const subscription = await Subscription.findOneBy({
        id: input.id,
        user: isAdmin ? undefined : { id: ctx.user.id },
      })
      if (!subscription) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subscription not found or not yours' })

      subscription.active = false
      await subscription.save()

      return { message: 'Subscription cancelled successfully', data: subscription }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const result = await Subscription.delete({ id: input.id })
      if (result.affected === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subscription not found' })

      return { message: 'Subscription deleted successfully', data: result }
    }),
})
