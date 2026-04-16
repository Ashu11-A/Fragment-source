import { dirname } from 'path'
import { Client } from 'rpc'
import type { Routers } from 'server'
import { fileURLToPath } from 'url'
import { Package, processPath } from 'utils'
import * as pkg from '../package.json' with { type: 'json' }
import { banner } from './ui.js'

Package.setData((pkg as unknown as { default: typeof pkg }).default)

export const { isPKG, root } = processPath(dirname(fileURLToPath(import.meta.url)))
export const API_URL = /* isPKG ? 'http://node.seventyhost.net:24370' :*/ 'http://0.0.0.0:3500'
export const client = new Client<Routers>(API_URL)

await banner((pkg as unknown as { default: typeof pkg }).default.version)

await import('./lang')
await import('./register')
await import('./app')
