import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join, normalize, resolve } from 'node:path'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { callCorePlugin, type CorePluginResultPayload } from '../services/corePluginBridge.js'
import { protectedProcedure, router } from '../trpc.js'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const MAX_BASE64_CHARS = Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 32

function getPluginsDir(): string {
  const p = process.env['FRAGMENT_CORE_PLUGINS_DIR'] as string | undefined
  if (p == null || p.length === 0) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'FRAGMENT_CORE_PLUGINS_DIR não está definido no servidor. Configure o caminho absoluto da pasta `plugins` do core.',
    })
  }
  return resolve(normalize(p))
}

function assertSafePluginFileName(name: string): string {
  const base = basename(name)
  if (base !== name) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Só o nome do ficheiro (sem pastas) é permitido.' })
  }
  if (base.includes('..')) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nome de ficheiro inválido.' })
  }
  if (!base.startsWith('plugin-') || !base.endsWith('.js')) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'O ficheiro deve chamar-se plugin-<nome>.js' })
  }
  if (base.length > 200) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nome de ficheiro demasiado longo.' })
  }
  return base
}

function throwIfCoreError(r: CorePluginResultPayload) {
  if (r.ok) return
  const base = r.message ?? 'O core recusou a operação'
  const msg =
    r.details != null && r.details.length > 0
      ? `${base}\n\n--- detalhes ---\n${r.details}`
      : base
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: msg,
  })
}

export const corePluginsRouter = router({
  list: protectedProcedure
    .input(z.object({ botId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const r = await callCorePlugin(ctx.req.log, ctx.user, input.botId, { action: 'list' })
      if (!r.ok) throwIfCoreError(r)
      return { message: 'ok', data: { plugins: r.plugins ?? [] } }
    }),

  reload: protectedProcedure
    .input(z.object({
      botId: z.number().int().positive(),
      filePath: z.string().min(1).max(4096),
    }))
    .mutation(async ({ ctx, input }) => {
      const r = await callCorePlugin(
        ctx.req.log,
        ctx.user,
        input.botId,
        { action: 'reload', filePath: input.filePath },
      )
      if (!r.ok) throwIfCoreError(r)
      return {
        message: 'Plugin recarregado',
        data: { pluginName: r.pluginName, filePath: r.filePath },
      }
    }),

  load: protectedProcedure
    .input(z.object({
      botId: z.number().int().positive(),
      filePath: z.string().min(1).max(4096),
    }))
    .mutation(async ({ ctx, input }) => {
      const r = await callCorePlugin(
        ctx.req.log,
        ctx.user,
        input.botId,
        { action: 'load', filePath: input.filePath },
      )
      if (!r.ok) throwIfCoreError(r)
      return {
        message: 'Plugin carregado',
        data: { pluginName: r.pluginName, filePath: r.filePath },
      }
    }),

  unload: protectedProcedure
    .input(z.object({
      botId: z.number().int().positive(),
      pluginName: z.string().min(1).max(256),
    }))
    .mutation(async ({ ctx, input }) => {
      const r = await callCorePlugin(
        ctx.req.log,
        ctx.user,
        input.botId,
        { action: 'unload', pluginName: input.pluginName },
      )
      if (!r.ok) throwIfCoreError(r)
      return { message: 'Plugin desativado', data: { pluginName: r.pluginName } }
    }),

  upload: protectedProcedure
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

      const r = await callCorePlugin(
        ctx.req.log,
        ctx.user,
        input.botId,
        { action: 'load', filePath: finalPath },
      )
      if (!r.ok) throwIfCoreError(r)
      return {
        message: 'Plugin enviado e carregado',
        data: { pluginName: r.pluginName, filePath: r.filePath },
      }
    }),
})
