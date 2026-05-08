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
  publishedAt: z.string().optional(),
  plugins: z.array(metadataPluginSchema).min(1).max(50),
}).passthrough()

const packageBundleSchema = z.object({
  fileName: z.string().min(3).max(256),
  mimeType: z.string().max(255).default('text/javascript'),
  contentBase64: z.string().min(1),
})

const createPackageSubmissionSchema = z.object({
  metadataBase64: z.string().min(1),
  bundles: z.array(packageBundleSchema).min(1).max(50),
  price: z.number().nonnegative().default(0),
  updates: z.string().max(20000).nullable().optional(),
})

export const createPackageSubmissionProcedure = protectedProcedure
  .input(createPackageSubmissionSchema)
  .mutation(async ({ input, ctx }) => {
    try {
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
      const metadataByName = new Map(metadata.plugins.map((plugin) => [plugin.name, plugin]))
      const created: PluginRelease[] = []

      for (const bundle of input.bundles) {
        const pluginMetadata = metadataByName.get(bundle.fileName)
        if (!pluginMetadata) throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${bundle.fileName} is not listed in metadata.json.`,
        })

        const bundleBuffer = Buffer.from(bundle.contentBase64, 'base64')
        if (pluginMetadata.size !== undefined && bundleBuffer.byteLength !== pluginMetadata.size)
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `${pluginMetadata.name} size does not match metadata.json.`,
          })

        const bundleHash = sha256(bundleBuffer)
        if (pluginMetadata.sha256 && bundleHash !== pluginMetadata.sha256)
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `${pluginMetadata.name} checksum does not match metadata.json.`,
          })

        const validation = validatePluginBundle(bundleBuffer)
        if (!validation.valid) throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${pluginMetadata.name}: ${validation.reason ?? 'Invalid plugin bundle.'}`,
        })

        const pluginName = pluginMetadata.manifest.metadata.name
        const version = pluginMetadata.version ?? pluginMetadata.manifest.metadata.version ?? metadata.version
        const description = pluginMetadata.manifest.metadata.description ?? `Plugin ${pluginName}`
        const minReleaseVersion = pluginMetadata.manifest.metadata.dependencies?.core ?? `^${metadata.version}`

        let plugin = await Plugin.findOne({
          where: { name: pluginName, creator: { id: ctx.user.id } },
          relations: { creator: true },
        })

        if (!plugin) {
          plugin = await Plugin.create({
            name: pluginName,
            price: input.price,
            description,
            readme: null,
            published: false,
            creator: { id: ctx.user.id },
          }).save()
        } else {
          plugin.description = plugin.description ?? description
          await plugin.save()
        }

        const pending = await PluginRelease.findOne({
          where: {
            plugin: { id: plugin.id },
            version,
            status: RequestStatus.Pending,
          },
        })
        if (pending) throw new TRPCError({
          code: 'CONFLICT',
          message: `${pluginName} v${version} already has a pending submission.`,
        })

        const bundleFile = await File.create({
          name: bundle.fileName,
          size: bundleBuffer.byteLength,
          type: FileType.Text,
          mimeType: bundle.mimeType,
          sha256: bundleHash,
        }).save()
        await storage.save(bundleHash, bundleBuffer)

        const envs = Array.isArray(pluginMetadata.manifest.envs)
          ? pluginMetadata.manifest.envs
          : null

        const release = await PluginRelease.create({
          status: RequestStatus.Pending,
          reviewNotes: null,
          name: `${pluginName} ${version}`,
          description,
          updates: input.updates ?? null,
          readme: null,
          version,
          minReleaseVersion,
          envs,
          file: bundleFile,
          plugin,
          creator: { id: ctx.user.id },
          reviewer: null,
          reviewedAt: null,
        }).save()

        created.push(release)
      }

      return { releases: created, count: created.length }
    } catch (error) {
      throw toTrpcError(error, 'Could not submit plugin release package')
    }
  })
