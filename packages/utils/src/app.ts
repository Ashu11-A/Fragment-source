import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Package } from './controllers/package'

export * from './controllers/package'
export * from './utils/index'

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

export type Metadata = {
  name: string
  version: string
  description: string
  author: string
  license: string
  api?: string
}  
export const metadata = (): Metadata => {
  const infos = ['name', 'version', 'description', 'author', 'license'].reverse()
  return Object.entries(Package.getData()).reverse().filter(([key]) => infos.includes(key)).reduce((object, [key, value]) => ({ [key]: value, ...object }), {}) as Metadata
}
