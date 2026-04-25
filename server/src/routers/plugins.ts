import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Plugin } from '../database/entity/Plugin.js'
import { repository } from '../database/index.js'
import { paginate, paginateSchema } from '../database/pagination.js'
import { adminProcedure, protectedProcedure, router } from '../trpc.js'

export const pluginsRouter = router({
  list: protectedProcedure
    .input(paginateSchema)
    .query(async ({ input }) => {
      const paginated = await paginate({
        page: input.page,
        pageSize: input.pageSize,
        interval: input.interval,
        day: input.day,
        orderBy: input.orderBy,
        orderDirection: input.orderDirection,
        repository: repository.plugin,
      })

      return { message: 'Plugin list request successful!', ...paginated }
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const plugin = await Plugin.findOne({
        where: { id: input.id },
        relations: { releases: true, bots: true },
      })
      if (!plugin) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plugin not found!' })

      return { message: 'Plugin retrieved successfully!', data: plugin }
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string(),
      price: z.number(),
    }))
    .mutation(async ({ input }) => {
      const plugin = await Plugin.create({
        name: input.name,
        price: input.price,
        subscriptions: [],
        releases: [],
        bots: [],
      }).save()

      return { message: 'Plugin created successfully!', data: plugin }
    }),
})
