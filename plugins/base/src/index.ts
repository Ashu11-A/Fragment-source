import * as pkg from '../package.json'
import { join } from 'path'

interface Metadata {
  name: string
  version: string
  description: string
  author: string
  license: string
}

export const PKG_MODE = `${process.cwd()}/src` !== __dirname
export const RootPATH = PKG_MODE ? join(process.cwd()) : join(__dirname)
export const metadata = async (): Promise<Metadata> => {
  const infos = ['name', 'version', 'description', 'author', 'license'].reverse()
  return Object.entries(pkg).reverse().filter(([key]) => infos.includes(key)).reduce((object, [key, value]) => ({ [key]: value, ...object }), {}) as Metadata
}
