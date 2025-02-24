import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import 'src/discord/commands/lang.js'
import { Package } from 'utils'
import * as pkg from '../package.json' assert { type: 'json' }
import { Crypt } from 'crypt'
import { API } from './controller/api'
Package.setData((pkg as unknown as { default: typeof pkg }).default)

export const __dirname = dirname(fileURLToPath(import.meta.url))
export const PKG_MODE = __dirname.includes('B:\\~BUN\\') || __dirname.includes('/$bunfs/root')
export const API_URL = PKG_MODE ? 'http://node.seventyhost.net:24370' : 'http://0.0.0.0:3500'
export const RootPATH: string = PKG_MODE ? process.cwd() : join(__dirname, '..')

export const storage = new Crypt()
const data = await storage.read(true)
export const api = new API({ accessToken: data?.accessToken, refreshToken: data?.refreshToken })
