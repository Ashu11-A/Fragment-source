import { protectedProcedure } from '@/trpc.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { RequestStatus, Role } from '@/database/enums.js'
import { z } from 'zod'
import { toTrpcError } from '../_shared/errors.js'

const listPublishRequestsSchema = z.object({
  status: z.nativeEnum(RequestStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).default({})

export const listPublishRequestsProcedure = protectedProcedure
  .input(listPublishRequestsSchema)
  .query(async ({ input, ctx }) => {
    try {
      const where = {
        ...(ctx.user.role === Role.Administrator ? {} : { creator: { id: ctx.user.id } }),
        ...(input.status ? { status: input.status } : {}),
      }

      return PluginRelease.find({
        where,
        relations: { plugin: true, creator: true, reviewer: true, file: true },
        order: { createdAt: 'DESC' },
        take: input.limit,
      })
    } catch (error) {
      throw toTrpcError(error, 'Could not list publish requests')
    }
  })
