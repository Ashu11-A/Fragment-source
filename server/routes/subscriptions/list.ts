import { repository } from '@/database/index.js'
import { paginate, paginateSchema } from '@/database/pagination.js'
import { Role } from '@/database/enums.js'
import { protectedProcedure } from '@/trpc.js'

export const list = protectedProcedure
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
  })
