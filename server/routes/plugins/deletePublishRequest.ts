import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { RequestStatus } from '@/database/enums.js'
import { adminProcedure } from '@/trpc.js'
import { toTrpcError } from '../_shared/errors.js'

const deletePublishRequestSchema = z.object({
  requestId: z.number().int().positive(),
})

export const deletePublishRequestProcedure = adminProcedure
  .input(deletePublishRequestSchema)
  .mutation(async ({ input }) => {
    try {
      const release = await PluginRelease.findOne({
        where: { id: input.requestId },
        relations: { plugin: true },
      })

      if (!release) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Publish request not found.',
      })

      const plugin = release.plugin
      await release.remove()

      const approvedCount = await PluginRelease.count({
        where: {
          plugin: { id: plugin.id },
          status: RequestStatus.Approved,
        },
      })
      plugin.published = approvedCount > 0
      await plugin.save()

      return { deleted: true, requestId: input.requestId }
    } catch (error) {
      throw toTrpcError(error, 'Could not delete publish request')
    }
  })
