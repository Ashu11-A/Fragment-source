import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { generatePort } from 'utils'

import 'src/discord/commands/lang.js'
import { Package } from 'utils/src/class/package'
import * as pkg from '../package.json' assert { type: 'json' }
Package.setData((pkg as unknown as { default: typeof pkg }).default)

export const cache = new Map()

export const __dirname = dirname(fileURLToPath(import.meta.url))
export const PKG_MODE = __dirname === '/$bunfs/root'
export const RootPATH: string = PKG_MODE ? process.cwd() : join(__dirname, '..')

cache.set('port', PKG_MODE ? await generatePort() : 3000)