import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { adminProcedure } from '@/trpc.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { RequestStatus } from '@/database/enums.js'
import { User } from '@/database/entity/User.js'
import { toTrpcError } from '../_shared/errors.js'

const decidePublishRequestSchema = z.object({
  requestId: z.number().int().positive(),
  approve: z.boolean(),
  reviewNotes: z.string().max(5000).nullable().optional(),
})

export const decidePublishRequestProcedure = adminProcedure
  .input(decidePublishRequestSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const release = await PluginRelease.findOne({
        where: { id: input.requestId },
        relations: { plugin: true },
      })

      if (!release) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Publish request not found.',
      })

      release.status = input.approve ? RequestStatus.Approved : RequestStatus.Rejected
      release.reviewNotes = input.reviewNotes ?? null
      const reviewer = await User.findOne({ where: { id: ctx.user.id } })
      if (!reviewer) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Reviewer user not found.',
      })
      release.reviewer = reviewer
      release.reviewedAt = new Date()
      await release.save()

      if (input.approve) {
        release.plugin.published = true
        await release.plugin.save()
      } else {
        const approvedCount = await PluginRelease.count({
          where: {
            plugin: { id: release.plugin.id },
            status: RequestStatus.Approved,
          },
        })
        release.plugin.published = approvedCount > 0
        await release.plugin.save()
      }

      return release
    } catch (error) {
      throw toTrpcError(error, 'Could not decide publish request')
    }
  })
