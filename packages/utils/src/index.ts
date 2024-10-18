import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

export * from './functions/actionDrawer'
export * from './functions/checkChannel'
export * from './functions/checker'
export * from './functions/format'
export * from './functions/buttonRedirect'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const __plugin_dirname = process.cwd()

export const packageData = JSON.parse(readFileSync(join(__plugin_dirname, 'package.json'), { encoding: 'utf-8' })) as Record<string, string>
export const PKG_MODE = `${process.cwd()}/src` === __dirname

interface Metadata {
    name: string
    version: string
    description: string
    author: string
    license: string
}  
export const metadata = (): Metadata => {
  const infos = ['name', 'version', 'description', 'author', 'license'].reverse()
  return Object.entries(packageData).reverse().filter(([key]) => infos.includes(key)).reduce((object, [key, value]) => ({ [key]: value, ...object }), {}) as Metadata
}
  