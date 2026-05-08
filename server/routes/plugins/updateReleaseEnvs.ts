import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { adminProcedure } from '@/trpc.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { toTrpcError } from '../_shared/errors.js'
import { pluginEnvVarDefinitionSchema } from './create.js'

const updateReleaseEnvsSchema = z.object({
  releaseId: z.number().int().positive(),
  envs: z.array(pluginEnvVarDefinitionSchema).nullable(),
})

export const updateReleaseEnvsProcedure = adminProcedure
  .input(updateReleaseEnvsSchema)
  .mutation(async ({ input }) => {
    try {
      const release = await PluginRelease.findOne({ where: { id: input.releaseId } })
      if (!release) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Plugin release not found.',
        })
      }
      release.envs = input.envs
      await release.save()
      return { success: true, releaseId: release.id, envs: release.envs }
    } catch (error) {
      throw toTrpcError(error, 'Could not update release env var definitions')
    }
  })
