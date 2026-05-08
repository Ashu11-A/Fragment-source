import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { storage } from '@/singletons.js'
import { adminProcedure } from '@/trpc.js'
import { toTrpcError } from '../_shared/errors.js'

const downloadPublishRequestSchema = z.object({
  requestId: z.number().int().positive(),
})

export const downloadPublishRequestProcedure = adminProcedure
  .input(downloadPublishRequestSchema)
  .query(async ({ input }) => {
    try {
      const release = await PluginRelease.findOne({
        where: { id: input.requestId },
        relations: { file: true, plugin: true },
      })

      if (!release) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Publish request not found.',
      })

      const buffer = await storage.load(release.file.sha256)
      if (!buffer) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Plugin bundle not found in storage.',
      })

      return {
        fileName: release.file.name,
        mimeType: release.file.mimeType,
        contentBase64: buffer.toString('base64'),
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not download plugin bundle')
    }
  })
