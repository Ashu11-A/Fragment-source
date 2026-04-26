import { z } from 'zod'
import { Plugin } from '@/database/entity/Plugin.js'
import { adminProcedure } from '@/trpc.js'

export const create = adminProcedure
  .input(z.object({
    name: z.string().min(1).max(256),
    price: z.number().nonnegative(),
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
  })
