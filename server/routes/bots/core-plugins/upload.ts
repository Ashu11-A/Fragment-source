import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { callCorePlugin } from '@/services/corePluginBridge.js'
import { toTrpcError } from '../../_shared/errors.js'
import { ensureCorePluginSuccess } from './shared.js'

const uploadCorePluginSchema = z.object({
  botId: z.number().int().positive(),
  fileName: z.string().min(3).max(200).regex(/^[a-zA-Z0-9._-]+\.js$/),
  contentBase64: z.string().min(1),
})

export const uploadCorePluginProcedure = protectedProcedure
  .input(uploadCorePluginSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const targetFolder = join(process.cwd(), 'storage', 'core-plugins', String(input.botId))
      await mkdir(targetFolder, { recursive: true })

      const filePath = join(targetFolder, input.fileName)
      await writeFile(filePath, Buffer.from(input.contentBase64, 'base64'))

      const result = await callCorePlugin(ctx.req.log, ctx.user, input.botId, {
        action: 'load',
        filePath,
      })

      ensureCorePluginSuccess(result)

      return {
        pluginName: result.pluginName,
        filePath,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not upload core plugin')
    }
  })
