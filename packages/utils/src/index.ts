import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { Package } from './class/package'

export * from './class/package'
export * from './functions/actionDrawer'
export * from './functions/buttonRedirect'
export * from './functions/checkers'
export * from './functions/format'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const __plugin_dirname = process.cwd()

export const PKG_MODE = __dirname === '/$bunfs/root'

interface Metadata {
    name: string
    version: string
    description: string
    author: string
    license: string
}  
export const metadata = (): Metadata => {
  const infos = ['name', 'version', 'description', 'author', 'license'].reverse()
  return Object.entries(Package.getData()).reverse().filter(([key]) => infos.includes(key)).reduce((object, [key, value]) => ({ [key]: value, ...object }), {}) as Metadata
}
