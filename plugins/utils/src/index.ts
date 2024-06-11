import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

interface Metadata {
  name: string
  version: string
  description: string
  author: string
  license: string
}

export const __dirname = dirname(fileURLToPath(import.meta.url))
export const packageData = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), { encoding: 'utf-8' })) as Record<string, string>

export const PKG_MODE = `${process.cwd()}/src` !== __dirname
export const RootPATH = PKG_MODE ? join(process.cwd()) : join(__dirname)
export const metadata = async (): Promise<Metadata> => {
  const infos = ['name', 'version', 'description', 'author', 'license'].reverse()
  return Object.entries(packageData).reverse().filter(([key]) => infos.includes(key)).reduce((object, [key, value]) => ({ [key]: value, ...object }), {}) as Metadata
}
