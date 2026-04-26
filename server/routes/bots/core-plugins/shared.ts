import { TRPCError } from '@trpc/server'
import { basename, normalize, resolve } from 'node:path'
import type { CorePluginResultPayload } from '@/services/corePluginBridge.js'

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export const MAX_BASE64_CHARS = Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 32

export function getPluginsDir(): string {
  const pluginsPath = process.env['FRAGMENT_CORE_PLUGINS_DIR'] as string | undefined
  if (pluginsPath == null || pluginsPath.length === 0) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'FRAGMENT_CORE_PLUGINS_DIR não está definido no servidor. Configure o caminho absoluto da pasta `plugins` do core.',
    })
  }
  return resolve(normalize(pluginsPath))
}

export function assertSafePluginFileName(name: string): string {
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

export function throwIfCoreError(result: CorePluginResultPayload) {
  if (result.ok) return
  const base = result.message ?? 'O core recusou a operação'
  const message =
    result.details != null && result.details.length > 0
      ? `${base}\n\n--- detalhes ---\n${result.details}`
      : base
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message })
}
