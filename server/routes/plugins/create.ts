import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { adminProcedure } from '@/trpc.js'
import { File } from '@/database/entity/File.js'
import { Node } from '@/database/entity/Node.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { RequestStatus } from '@/database/enums.js'
import { nodeBridge } from '@/services/NodeBridge.js'
import { storage, baseUrl } from '@/singletons.js'
import { sha256 } from '@/lib/hash.js'
import { validatePluginBundle } from '@/lib/pluginBundleValidation.js'
import { FileType } from 'storage'
import { toTrpcError } from '../_shared/errors.js'

export const pluginEnvVarDefinitionSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(2000),
  required: z.boolean().optional(),
  default: z.string().optional(),
  type: z.enum(['string', 'number', 'boolean', 'secret']).optional(),
})

const createPluginSchema = z.object({
  name: z.string().min(2).max(256),
  price: z.number().nonnegative(),
  description: z.string().max(20000).nullable().optional(),
  readme: z.string().max(100000).nullable().optional(),
  creatorId: z.number().int().positive().optional(),
  published: z.boolean().default(false),
  iconBase64: z.string().optional(),
  iconFileName: z.string().max(256).optional(),
  iconMimeType: z.string().max(255).optional(),
  bundleBase64: z.string().min(1),
  bundleFileName: z.string().min(3).max(256),
  bundleMimeType: z.string().max(255).default('text/javascript'),
  releaseName: z.string().min(2).max(256).default('Initial Release'),
  version: z.string().min(1).max(64).default('1.0.0'),
  minReleaseVersion: z.string().min(1).max(64).default('^1.0.0'),
  updates: z.string().max(20000).nullable().optional(),
  envs: z.array(pluginEnvVarDefinitionSchema).optional(),
  deployNodeId: z.number().int().positive().optional(),
})

export const createPluginProcedure = adminProcedure
  .input(createPluginSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const creatorId = input.creatorId ?? ctx.user.id

      let iconFile: File | null = null
      if (input.iconBase64) {
        const iconBuffer = Buffer.from(input.iconBase64, 'base64')
        const iconHash = sha256(iconBuffer)
        iconFile = await File.create({
          name: input.iconFileName ?? 'plugin-icon.png',
          size: iconBuffer.byteLength,
          type: FileType.Image,
          mimeType: input.iconMimeType ?? 'image/png',
          sha256: iconHash,
        }).save()
        await storage.save(iconHash, iconBuffer)
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

      const plugin = await Plugin.create({
        name: input.name,
        price: input.price,
        description: input.description ?? null,
        readme: input.readme ?? null,
        published: input.published,
        icon: iconFile,
        creator: { id: creatorId },
      }).save()

      const release = await PluginRelease.create({
        status: RequestStatus.Approved,
        reviewNotes: 'Created by administrator',
        name: input.releaseName,
        description: input.description ?? 'No description provided',
        updates: input.updates ?? null,
        readme: input.readme ?? null,
        version: input.version,
        minReleaseVersion: input.minReleaseVersion,
        envs: input.envs ?? null,
        file: bundleFile,
        plugin,
        creator: { id: creatorId },
        reviewer: { id: ctx.user.id },
        reviewedAt: new Date(),
      }).save()

      let nodeInstance: { nodeId: number; ok: boolean; details?: string } | null = null
      if (input.deployNodeId) {
        const node = await Node.findOne({ where: { id: input.deployNodeId } })
        if (!node) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Deploy node not found.',
          })
        }

        try {
          await nodeBridge.create(ctx.req.log, node.id, {
            action: 'create',
            pluginId: plugin.id,
            name: `fragment-plugin-${plugin.id}-node-${node.id}`,
            pluginDeployUrl: `${baseUrl}/api/node/${node.id}/plugins/${plugin.id}/deploy`,
          })
          nodeInstance = { nodeId: node.id, ok: true }
        } catch (error) {
          nodeInstance = {
            nodeId: node.id,
            ok: false,
            details: error instanceof Error ? error.message : 'Deploy failed.',
          }
        }
      }

      return {
        plugin,
        release,
        nodeInstance,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not create plugin')
    }
  })
