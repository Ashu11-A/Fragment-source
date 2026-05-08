import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { File } from '@/database/entity/File.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { RequestStatus } from '@/database/enums.js'
import { FileType } from 'storage'
import { sha256 } from '@/lib/hash.js'
import { validatePluginBundle } from '@/lib/pluginBundleValidation.js'
import { storage } from '@/singletons.js'
import { toTrpcError } from '../_shared/errors.js'

const updatePublishRequestSchema = z.object({
  requestId: z.number().int().positive(),
  name: z.string().min(2).max(256).optional(),
  description: z.string().min(2).max(20000).optional(),
  updates: z.string().max(20000).nullable().optional(),
  readme: z.string().max(100000).nullable().optional(),
  version: z.string().min(1).max(64).optional(),
  minReleaseVersion: z.string().min(1).max(64).optional(),
  bundleBase64: z.string().optional(),
  bundleFileName: z.string().min(3).max(256).optional(),
  bundleMimeType: z.string().max(255).optional(),
})

export const updatePublishRequestProcedure = protectedProcedure
  .input(updatePublishRequestSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const release = await PluginRelease.findOne({
        where: {
          id: input.requestId,
          creator: { id: ctx.user.id },
          status: RequestStatus.Pending,
        },
        relations: { file: true },
      })

      if (!release) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Pending publish request not found.',
      })

      if (input.name !== undefined) release.name = input.name
      if (input.description !== undefined) release.description = input.description
      if (input.updates !== undefined) release.updates = input.updates
      if (input.readme !== undefined) release.readme = input.readme
      if (input.version !== undefined) release.version = input.version
      if (input.minReleaseVersion !== undefined) release.minReleaseVersion = input.minReleaseVersion

      if (input.bundleBase64 !== undefined) {
        const bundleBuffer = Buffer.from(input.bundleBase64, 'base64')
        const validation = validatePluginBundle(bundleBuffer)
        if (!validation.valid) throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.reason ?? 'Invalid plugin bundle.',
        })

        const bundleHash = sha256(bundleBuffer)
        const bundleFile = await File.create({
          name: input.bundleFileName ?? release.file.name,
          size: bundleBuffer.byteLength,
          type: FileType.Text,
          mimeType: input.bundleMimeType ?? release.file.mimeType,
          sha256: bundleHash,
        }).save()
        await storage.save(bundleHash, bundleBuffer)
        release.file = bundleFile
      }

      await release.save()
      return release
    } catch (error) {
      throw toTrpcError(error, 'Could not update publish request')
    }
  })
