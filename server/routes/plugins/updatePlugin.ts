import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Role } from '@/database/enums.js'
import { toTrpcError } from '../_shared/errors.js'

const updatePluginSchema = z.object({
  pluginId: z.number().int().positive(),
  name: z.string().min(2).max(256).optional(),
  price: z.number().nonnegative().optional(),
  description: z.string().max(20000).nullable().optional(),
  readme: z.string().max(100000).nullable().optional(),
  published: z.boolean().optional(),
})

export const updatePluginProcedure = protectedProcedure
  .input(updatePluginSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const plugin = await Plugin.findOne({
        where: ctx.user.role === Role.Administrator
          ? { id: input.pluginId }
          : { id: input.pluginId, creator: { id: ctx.user.id } },
      })

      if (!plugin) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Plugin not found or not owned by you.',
        })
      }

      if (input.name !== undefined) plugin.name = input.name
      if (input.price !== undefined) plugin.price = input.price
      if (input.description !== undefined) plugin.description = input.description
      if (input.readme !== undefined) plugin.readme = input.readme
      if (input.published !== undefined && ctx.user.role === Role.Administrator) plugin.published = input.published

      return plugin.save()
    } catch (error) {
      throw toTrpcError(error, 'Could not update plugin')
    }
  })
