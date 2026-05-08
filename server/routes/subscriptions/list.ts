import { protectedProcedure } from '@/trpc.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { Role } from '@/database/enums.js'
import { paginationSchema, getSkip } from '../_shared/pagination.js'
import { toTrpcError } from '../_shared/errors.js'

export const listSubscriptionsProcedure = protectedProcedure
  .input(paginationSchema)
  .query(async ({ input, ctx }) => {
    try {
      const query = Subscription.createQueryBuilder('subscription')
        .leftJoinAndSelect('subscription.user', 'user')
        .leftJoinAndSelect('subscription.plan', 'plan')
        .orderBy('subscription.createdAt', 'DESC')
        .skip(getSkip(input.page, input.limit))
        .take(input.limit)

      if (ctx.user.role !== Role.Administrator) {
        query.where('user.id = :userId', { userId: ctx.user.id })
      }

      const [items, total] = await query.getManyAndCount()

      return {
        items,
        total,
        page: input.page,
        limit: input.limit,
        pageCount: Math.ceil(total / input.limit),
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not list subscriptions')
    }
  })
