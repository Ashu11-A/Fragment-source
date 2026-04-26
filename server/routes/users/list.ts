import { repository } from '@/database/index.js'
import { paginate, paginateSchema } from '@/database/pagination.js'
import { adminProcedure } from '@/trpc.js'

export const list = adminProcedure
  .input(paginateSchema)
  .query(async ({ input }) => {
    const paginated = await paginate({
      repository: repository.user,
      page: input.page,
      pageSize: input.pageSize,
      interval: input.interval,
      day: input.day,
      orderBy: input.orderBy,
      orderDirection: input.orderDirection,
      relations: { auths: false },
    })

    return { message: 'Users retrieved successfully', ...paginated }
  })
