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
import { pluginEnvVarDefinitionSchema } from './create.js'

const createPluginSubmissionSchema = z.object({
  name: z.string().min(2).max(256),
  price: z.number().nonnegative().default(0),
  description: z.string().min(2).max(20000),
  readme: z.string().max(100000).nullable().optional(),
  releaseName: z.string().min(2).max(256).default('Initial Release'),
  updates: z.string().max(20000).nullable().optional(),
  version: z.string().min(1).max(64),
  minReleaseVersion: z.string().min(1).max(64),
  bundleBase64: z.string().min(1),
  bundleFileName: z.string().min(3).max(256),
  bundleMimeType: z.string().max(255).default('text/javascript'),
  envs: z.array(pluginEnvVarDefinitionSchema).optional(),
})

export const createPluginSubmissionProcedure = protectedProcedure
  .input(createPluginSubmissionSchema)
  .mutation(async ({ input, ctx }) => {
    try {
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

      const plugin = await Plugin.create({
        name: input.name,
        price: input.price,
        description: input.description,
        readme: input.readme ?? null,
        published: false,
        creator: { id: ctx.user.id },
      }).save()

      const release = await PluginRelease.create({
        status: RequestStatus.Pending,
        reviewNotes: null,
        name: input.releaseName,
        description: input.description,
        updates: input.updates ?? null,
        readme: input.readme ?? null,
        version: input.version,
        minReleaseVersion: input.minReleaseVersion,
        envs: input.envs ?? null,
        file: bundleFile,
        plugin,
        creator: { id: ctx.user.id },
        reviewer: null,
        reviewedAt: null,
      }).save()

      return { plugin, release }
    } catch (error) {
      throw toTrpcError(error, 'Could not submit plugin')
    }
  })
