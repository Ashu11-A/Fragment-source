import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { callCorePlugin } from '@/services/corePluginBridge.js'
import { protectedProcedure } from '@/trpc.js'
import { assertSafePluginFileName, getPluginsDir, MAX_BASE64_CHARS, MAX_UPLOAD_BYTES, throwIfCoreError } from './shared.js'

export const upload = protectedProcedure
  .input(z.object({
    botId: z.number().int().positive(),
    fileName: z.string().min(1).max(200),
    contentBase64: z.string().min(1).max(MAX_BASE64_CHARS),
  }))
  .mutation(async ({ ctx, input }) => {
    const baseName = assertSafePluginFileName(input.fileName)
    const dir = getPluginsDir()
    await mkdir(dir, { recursive: true })

    let buffer: Buffer
    try {
      buffer = Buffer.from(input.contentBase64, 'base64')
    } catch {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Base64 inválido' })
    }
    if (buffer.length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ficheiro vazio' })
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ficheiro excede o tamanho máximo permitido' })
    }

    const finalPath = join(dir, baseName)
    await writeFile(finalPath, buffer)

    const result = await callCorePlugin(
      ctx.req.log,
      ctx.user,
      input.botId,
      { action: 'load', filePath: finalPath },
    )
    if (!result.ok) throwIfCoreError(result)
    return {
      message: 'Plugin enviado e carregado',
      data: { pluginName: result.pluginName, filePath: result.filePath },
    }
  })
