import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { toTrpcError } from '../_shared/errors.js'

const marketplaceListSchema = z.object({
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
}).default({})

export const marketplaceListProcedure = protectedProcedure
  .input(marketplaceListSchema)
  .query(async ({ input }) => {
    try {
      const qb = Plugin.createQueryBuilder('plugin')
        .leftJoinAndSelect('plugin.creator', 'creator')
        .leftJoinAndSelect('plugin.icon', 'icon')
        .where('plugin.published = :published', { published: true })
        .orderBy('plugin.createdAt', 'DESC')
        .take(input.limit)

      const search = input.search?.trim()
      if (search) {
        qb.andWhere('(plugin.name LIKE :search OR plugin.description LIKE :search)', {
          search: `%${search}%`,
        })
      }

      const items = await qb.getMany()
      return items
    } catch (error) {
      throw toTrpcError(error, 'Could not list marketplace plugins')
    }
  })
