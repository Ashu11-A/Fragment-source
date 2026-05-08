import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Role } from '@/database/enums.js'
import { toTrpcError } from '../_shared/errors.js'

const getPluginSchema = z.object({
  id: z.number().int().positive(),
})

export const getPluginProcedure = protectedProcedure
  .input(getPluginSchema)
  .query(async ({ input, ctx }) => {
    try {
      const plugin = await Plugin.findOne({
        where: { id: input.id },
        relations: {
          releases: {
            file: true,
            creator: true,
            reviewer: true,
          },
          bots: true,
          creator: true,
          icon: true,
        },
      })

      if (!plugin) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Plugin not found.',
      })

      if (ctx.user.role !== Role.Administrator && !plugin.published && plugin.creator.id !== ctx.user.id)
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Plugin is not accessible.',
        })

      plugin.releases = [...plugin.releases].sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      })

      return plugin
    } catch (error) {
      throw toTrpcError(error, 'Could not fetch plugin')
    }
  })
