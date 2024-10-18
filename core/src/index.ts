import path, { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import * as pkg from '../package.json' assert { type: 'json' }
import { generatePort } from './functions/port.js'

export const __dirname = dirname(fileURLToPath(import.meta.url))
export const PKG_MODE = join(process.cwd(), '/src') !== __dirname
export const RootPATH: string = PKG_MODE ? path.join(process.cwd()) : path.join(__dirname, '..')

export const metadata = pkg.default
export const cache = new Map()

cache.set('port', PKG_MODE ? await generatePort() : 3000)
