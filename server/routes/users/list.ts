import { adminProcedure } from '@/trpc.js'
import { User } from '@/database/entity/User.js'
import { paginationSchema, getSkip } from '../_shared/pagination.js'
import { toTrpcError } from '../_shared/errors.js'

export const listUsersProcedure = adminProcedure
  .input(paginationSchema)
  .query(async ({ input }) => {
    try {
      const [items, total] = await User.findAndCount({
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
      throw toTrpcError(error, 'Could not list users')
    }
  })
