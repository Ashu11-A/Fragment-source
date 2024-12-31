import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import 'src/discord/commands/lang.js'
import { Package } from 'utils'
import * as pkg from '../package.json' assert { type: 'json' }
Package.setData((pkg as unknown as { default: typeof pkg }).default)

export const __dirname = dirname(fileURLToPath(import.meta.url))
export const PKG_MODE = __dirname === '/$bunfs/root'
export const RootPATH: string = PKG_MODE ? process.cwd() : join(__dirname, '..')