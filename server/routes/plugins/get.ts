import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Plugin } from '@/database/entity/Plugin.js'
import { protectedProcedure } from '@/trpc.js'

export const get = protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const plugin = await Plugin.findOne({
      where: { id: input.id },
      relations: { releases: true, bots: true },
    })
    if (!plugin) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plugin not found!' })

    return { message: 'Plugin retrieved successfully!', data: plugin }
  })
