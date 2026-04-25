import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Bot } from '../database/entity/Bot.js'
import { repository } from '../database/index.js'
import { paginate, paginateSchema } from '../database/pagination.js'
import { Role } from '../database/enums.js'
import { assertUserOwnsBot, fetchBotActivityLogs } from '../services/botActivity.js'
import { protectedProcedure, publicProcedure, router } from '../trpc.js'
import { corePluginsRouter } from './bots.corePlugins.js'

export const botsRouter = router({
  corePlugins: corePluginsRouter,
  list: protectedProcedure
    .input(paginateSchema.extend({ type: z.enum(['your', 'other']).default('your') }))
    .query(async ({ input, ctx }) => {
      const isAdmin = ctx.user.role === Role.Administrator

      const paginated = await paginate({
        repository: repository.bot,
        page: input.page,
        pageSize: input.pageSize,
        interval: input.interval,
        day: input.day,
        orderBy: input.orderBy,
        orderDirection: input.orderDirection,
        user: (isAdmin && input.type === 'other') ? undefined : { id: ctx.user.id },
      })

      return { message: 'Request completed successfully!', ...paginated }
    }),

  get: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const bot = await Bot.findOneBy({ id: input.id })
      if (!bot) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bot not found!' })

      return { message: 'Request completed successfully!', data: bot }
    }),

  status: protectedProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()) }))
    .query(async ({ input }) => {
      const { Fastify } = await import('../controllers/fastify.js')
      const io = Fastify.server?.io
      
      const statuses: Record<number, boolean> = {}
      for (const id of input.ids) {
        const room = io?.sockets.adapter.rooms.get(`bot:${id}`)
        statuses[id] = room ? room.size > 0 : false
      }
      
      return { message: 'Statuses retrieved successfully!', data: statuses }
    }),

  create: protectedProcedure
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
    }),

  update: protectedProcedure
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
    }),

  activity: router({
    list: protectedProcedure
      .input(z.object({
        botId: z.number().int().positive(),
        limit: z.number().int().min(1).max(500).default(50),
      }))
      .query(async ({ input, ctx }) => {
        if (!await assertUserOwnsBot(ctx.user, input.botId)) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Bot not found, maybe it\'s not yours!' })
        }

        const rows = await fetchBotActivityLogs(input.botId, input.limit)
        const data = rows.map((r) => ({
          id: r.id,
          botId: r.botId,
          level: r.level,
          category: r.category,
          message: r.message,
          display: r.display,
          metadata: r.metadata,
          source: r.source,
          correlationId: r.correlationId,
          createdAt: r.createdAt.toISOString(),
        }))
        return { message: 'Activity loaded', data }
      }),
  }),

  delete: protectedProcedure
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

      await Promise.all(bot.subscriptions.map((s) => s.remove()))
      const removed = await bot.remove()

      return { message: 'Bot with your signature successfully removed!', data: removed }
    }),
})
