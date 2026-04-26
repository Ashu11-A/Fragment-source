import { repository } from '@/database/index.js'
import { paginate, paginateSchema } from '@/database/pagination.js'
import { protectedProcedure } from '@/trpc.js'

export const list = protectedProcedure
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
  })
