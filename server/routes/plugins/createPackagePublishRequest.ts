import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { File } from '@/database/entity/File.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { RequestStatus } from '@/database/enums.js'
import { FileType } from 'storage'
import { protectedProcedure } from '@/trpc.js'
import { sha256 } from '@/lib/hash.js'
import { validatePluginBundle } from '@/lib/pluginBundleValidation.js'
import { storage } from '@/singletons.js'
import { toTrpcError } from '../_shared/errors.js'

const metadataPluginSchema = z.object({
  name: z.string().min(3).max(256),
  version: z.string().min(1).max(64).optional(),
  size: z.number().int().positive().optional(),
  sha256: z.string().length(64).optional(),
  manifest: z.object({
    metadata: z.object({
      name: z.string().min(2).max(256),
      version: z.string().min(1).max(64).optional(),
      description: z.string().max(20000).optional(),
      dependencies: z.record(z.string(), z.string()).optional(),
    }).passthrough(),
  }).passthrough(),
}).passthrough()

const releaseMetadataSchema = z.object({
  version: z.string().min(1).max(64),
  plugins: z.array(metadataPluginSchema).min(1).max(50),
}).passthrough()

const createPackagePublishRequestSchema = z.object({
  pluginId: z.number().int().positive(),
  metadataBase64: z.string().min(1),
  bundle: z.object({
    fileName: z.string().min(3).max(256),
    mimeType: z.string().max(255).default('text/javascript'),
    contentBase64: z.string().min(1),
  }),
  updates: z.string().max(20000).nullable().optional(),
})

export const createPackagePublishRequestProcedure = protectedProcedure
  .input(createPackagePublishRequestSchema)
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

      const metadataBuffer = Buffer.from(input.metadataBase64, 'base64')
      let metadataJson: unknown
      try {
        metadataJson = JSON.parse(metadataBuffer.toString('utf8'))
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'metadata.json is not valid JSON.',
        })
      }

      const metadata = releaseMetadataSchema.parse(metadataJson)
      const pluginMetadata = metadata.plugins.find((entry) => entry.name === input.bundle.fileName)
      if (!pluginMetadata) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${input.bundle.fileName} is not listed in metadata.json.`,
        })
      }

      const metadataPluginName = pluginMetadata.manifest.metadata.name
      if (metadataPluginName !== plugin.name) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `metadata.json describes "${metadataPluginName}", but this version is being submitted for "${plugin.name}".`,
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

      const bundleBuffer = Buffer.from(input.bundle.contentBase64, 'base64')
      if (pluginMetadata.size !== undefined && bundleBuffer.byteLength !== pluginMetadata.size) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${input.bundle.fileName} size does not match metadata.json.`,
        })
      }

      const bundleHash = sha256(bundleBuffer)
      if (pluginMetadata.sha256 && bundleHash !== pluginMetadata.sha256) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${input.bundle.fileName} checksum does not match metadata.json.`,
        })
      }

      const validation = validatePluginBundle(bundleBuffer)
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.reason ?? 'Invalid plugin bundle.',
        })
      }

      const version = pluginMetadata.version ?? pluginMetadata.manifest.metadata.version ?? metadata.version
      const description = pluginMetadata.manifest.metadata.description ?? plugin.description ?? `Plugin ${plugin.name}`
      const minReleaseVersion = pluginMetadata.manifest.metadata.dependencies?.core ?? `^${metadata.version}`

      const bundleFile = await File.create({
        name: input.bundle.fileName,
        size: bundleBuffer.byteLength,
        type: FileType.Text,
        mimeType: input.bundle.mimeType,
        sha256: bundleHash,
      }).save()
      await storage.save(bundleHash, bundleBuffer)

      return PluginRelease.create({
        status: RequestStatus.Pending,
        reviewNotes: null,
        name: `${plugin.name} ${version}`,
        description,
        updates: input.updates ?? null,
        readme: null,
        version,
        minReleaseVersion,
        file: bundleFile,
        plugin,
        creator: { id: ctx.user.id },
        reviewer: null,
        reviewedAt: null,
      }).save()
    } catch (error) {
      throw toTrpcError(error, 'Could not create publish request from metadata')
    }
  })
