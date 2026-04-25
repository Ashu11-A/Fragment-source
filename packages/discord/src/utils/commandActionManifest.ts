import type { ComponentManifest } from '../types/plugin.js'
import { toPluginComponentPath } from './pluginComponentPath.js'

/**
 * Mesmos `customId` que `toPluginComponentPath(parser)` em runtime (prefixo = plugin do package).
 * Comandos registam interações com `.action(name, bot)` em vez de `ctx.component`, mas o manifest
 * e o core precisam da mesma lista para inspeção e contagem.
 */
export function collectCommandActionComponents (input: unknown): ComponentManifest[] {
  if (input == null || typeof input !== 'object') return []

  const data =
    'data' in input && (input as { data: unknown }).data != null
      ? (input as { data: { name?: string; actions?: Record<string, unknown> } }).data
      : (input as { name?: string; actions?: Record<string, unknown> })

  if (typeof data?.name !== 'string') return []

  const actions = data.actions
  if (actions == null || typeof actions !== 'object') return []

  const out: ComponentManifest[] = []

  for (const action of Object.values(actions)) {
    if (action == null || typeof action !== 'object') continue
    const type = (action as { type?: unknown }).type
    const options = (action as { options?: unknown }).options
    if (typeof type !== 'string') continue
    if (options == null || typeof options !== 'object') continue
    const parser = (options as { parser?: unknown }).parser
    if (typeof parser !== 'string') continue

    out.push({ customId: toPluginComponentPath(parser), types: [type] })
  }

  return out
}
