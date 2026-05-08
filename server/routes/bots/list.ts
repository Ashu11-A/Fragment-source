import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Bot } from '@/database/entity/Bot.js'
import { Role } from '@/database/enums.js'
import { getSkip } from '../_shared/pagination.js'
import { toTrpcError } from '../_shared/errors.js'

const listBotsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  onlyMine: z.boolean().default(true),
}).default({})

export const listBotsProcedure = protectedProcedure
  .input(listBotsSchema)
  .query(async ({ input, ctx }) => {
    try {
      const canSeeAll = ctx.user.role === Role.Administrator && input.onlyMine === false
      const where = canSeeAll ? {} : { user: { id: ctx.user.id } }

      const [items, total] = await Bot.findAndCount({
        where,
        relations: { user: true, node: true, plugins: true },
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
      throw toTrpcError(error, 'Could not list bots')
    }
  })
