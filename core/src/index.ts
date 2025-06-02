import { dirname, join } from 'path'
import { Client } from 'rpc'
import type { Routers } from 'server'
import { fileURLToPath } from 'url'
import { Package } from 'utils'
import * as pkg from '../package.json' assert { type: 'json' }

Package.setData((pkg as unknown as { default: typeof pkg }).default)

export const __dirname = dirname(fileURLToPath(import.meta.url))
export const PKG_MODE = __dirname.includes('B:\\~BUN\\') || __dirname.includes('/$bunfs/root')
export const RootPATH: string = PKG_MODE ? process.cwd() : join(__dirname, '..')
export const API_URL = /*PKG_MODE ? 'http://node.seventyhost.net:24370' :*/ 'http://0.0.0.0:3500'
export const client = new Client<Routers>(API_URL)

await import('./lang')
await import('./register')
await import('src/discord/commands/lang.js')
await import('./app')
