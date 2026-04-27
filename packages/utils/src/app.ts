import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Package } from '@/controllers/package'
import type { Metadata } from '@/types/index.js'

export * from '@/controllers/package'
export * from '@/utils/index'
export type { Metadata } from '@/types/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const __plugin_dirname = process.cwd()
export const isPKG = (path: string) =>  {
  return __dirname === path
}

export function processPath (path: string) {
  const isPKG = path.includes('B:\\~BUN\\') || path.includes('/$bunfs/root')
  const root: string = isPKG ? process.cwd() : join(path, '..')

  return { isPKG, root }
}

export const metadata = (): Metadata => {
  const pkg = Package.getData() as Record<string, unknown>
  const infos = ['name', 'version', 'description', 'author', 'license']
  const base = Object.entries(pkg)
    .filter(([key]) => infos.includes(key))
    .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {}) as Metadata

  const fragment = pkg['fragment'] as Record<string, unknown> | undefined
  if (Array.isArray(fragment?.['dependencies'])) {
    base.dependencies = fragment['dependencies'] as Array<{ name: string; version: string }>
  }

  return base
}
