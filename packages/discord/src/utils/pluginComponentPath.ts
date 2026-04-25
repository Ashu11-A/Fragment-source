import { Analyze } from 'url-ast'
import { Package } from 'utils'

/**
 * Path estável por plugin: `/<chaveDoPacote>/<segmento>`.
 * Chave = nome do package sem prefixo `plugin-` (ex. `plugin-ticket` → `ticket`).
 * Ex.: parser `Switch` → `/ticket/Switch`
 *
 * Se `suffix` já começa com `/`, trata-se de path absoluto (ex. rotas com parâmetros)
 * e é normalizado só com `Analyze`.
 *
 * Não usar `ctx.component` para os mesmos `Button` já ligados a `.action(…, bot)` nesse
 * comando — o Constatic já regista o `Responder`.
 */
export function toPluginComponentPath (suffix: string): string {
  if (suffix.startsWith('/')) {
    return new Analyze(suffix).getPathname()
  }
  const raw = Package.getData().name
  const name = typeof raw === 'string' ? raw : ''
  const key = name.replace(/^plugin-/, '') || name
  if (key.length === 0) {
    throw new Error(
      'toPluginComponentPath: `Package.setData(pkg)` must run before Discord modules load (see register.ts: dynamic import after setData).',
    )
  }
  const segment = suffix.replace(/^\/+/, '')
  if (segment.length === 0) {
    return new Analyze(`/${key}`).getPathname()
  }
  return new Analyze(`/${key}/${segment}`).getPathname()
}
