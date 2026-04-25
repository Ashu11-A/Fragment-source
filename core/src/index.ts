import { dirname } from 'path'
import { createTRPCClient, httpBatchLink, httpLink, splitLink } from '@trpc/client'
import type { AppRouter } from 'server'
import { fileURLToPath } from 'url'
import { Package, processPath } from 'utils'
import * as pkg from '../package.json' with { type: 'json' }
import { banner, log, spinner } from './ui.js'
import { Database } from 'database'

Package.setData((pkg as unknown as { default: typeof pkg }).default)

export const { isPKG, root } = processPath(dirname(fileURLToPath(import.meta.url)))
export const API_URL = /* isPKG ? 'http://node.seventyhost.net:24370' :*/ 'http://0.0.0.0:3500'

import { connectSocket } from './socket.js'
import { startConsoleMirror } from './consoleMirror.js'

let accessToken: string | undefined

export function setAccessToken (token: string | undefined) {
  accessToken = token
  if (token) connectSocket(token)
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (operation) => {
        const path = Array.isArray(operation.path) ? operation.path.join('.') : String(operation.path)
        return path !== 'auth.discordExchange'
      },
      true: httpBatchLink({
        url: `${API_URL}/trpc`,
        headers: () => ({
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        }),
      }),
      false: httpLink({
        url: `${API_URL}/trpc`,
        headers: () => ({
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        }),
      }),
    }),
  ],
})

export const database = new Database({
  root,
  log: (msg) => log.info(msg),
  spinner: (msg) => spinner(msg).start(),
})

startConsoleMirror(root)

await banner((pkg as unknown as { default: typeof pkg }).default.version)

await import('./lang')
await import('./register')
await import('./app')
