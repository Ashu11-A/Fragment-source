import { protectedProcedure } from '@/trpc.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Role } from '@/database/enums.js'
import { paginationSchema, getSkip } from '../_shared/pagination.js'
import { toTrpcError } from '../_shared/errors.js'

export const listPluginsProcedure = protectedProcedure
  .input(paginationSchema)
  .query(async ({ input, ctx }) => {
    try {
      const where = ctx.user.role === Role.Administrator
        ? {}
        : [{ published: true }, { creator: { id: ctx.user.id } }]

      const [items, total] = await Plugin.findAndCount({
        where,
        relations: { creator: true, icon: true },
        order: { createdAt: 'DESC' },
        skip: getSkip(input.page, input.limit),
        take: input.limit,
      })

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
        pageCount: Math.ceil(total / input.limit),
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not list plugins')
    }
  })
