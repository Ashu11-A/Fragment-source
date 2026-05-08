import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { File } from '@/database/entity/File.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { RequestStatus } from '@/database/enums.js'
import { FileType } from 'storage'
import { sha256 } from '@/lib/hash.js'
import { validatePluginBundle } from '@/lib/pluginBundleValidation.js'
import { storage } from '@/singletons.js'
import { toTrpcError } from '../_shared/errors.js'

const createPublishRequestSchema = z.object({
  pluginId: z.number().int().positive(),
  name: z.string().min(2).max(256),
  description: z.string().min(2).max(20000),
  updates: z.string().max(20000).nullable().optional(),
  readme: z.string().max(100000).nullable().optional(),
  version: z.string().min(1).max(64),
  minReleaseVersion: z.string().min(1).max(64),
  bundleBase64: z.string().min(1),
  bundleFileName: z.string().min(3).max(256),
  bundleMimeType: z.string().max(255).default('text/javascript'),
})

export const createPublishRequestProcedure = protectedProcedure
  .input(createPublishRequestSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const plugin = await Plugin.findOne({
        where: { id: input.pluginId, creator: { id: ctx.user.id } },
      })

      if (!plugin) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Plugin not found or not owned by you.',
        })
      }

      const hasPending = await PluginRelease.findOne({
        where: {
          plugin: { id: plugin.id },
          creator: { id: ctx.user.id },
          status: RequestStatus.Pending,
        },
      })

      if (hasPending) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'There is already a pending publish request.',
        })
      }

      const bundleBuffer = Buffer.from(input.bundleBase64, 'base64')
      const validation = validatePluginBundle(bundleBuffer)
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.reason ?? 'Invalid plugin bundle.',
        })
      }

      const bundleHash = sha256(bundleBuffer)
      const bundleFile = await File.create({
        name: input.bundleFileName,
        size: bundleBuffer.byteLength,
        type: FileType.Text,
        mimeType: input.bundleMimeType,
        sha256: bundleHash,
      }).save()
      await storage.save(bundleHash, bundleBuffer)

      return PluginRelease.create({
        status: RequestStatus.Pending,
        reviewNotes: null,
        name: input.name,
        description: input.description,
        updates: input.updates ?? null,
        readme: input.readme ?? null,
        version: input.version,
        minReleaseVersion: input.minReleaseVersion,
        file: bundleFile,
        plugin,
        creator: { id: ctx.user.id },
        reviewer: null,
        reviewedAt: null,
      }).save()
    } catch (error) {
      throw toTrpcError(error, 'Could not create publish request')
    }
  })
