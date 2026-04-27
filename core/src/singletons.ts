import { dirname } from 'path'
import { createTRPCClient, httpBatchLink, httpLink, splitLink } from '@trpc/client'
import type { AppRouter } from 'server'
import { fileURLToPath } from 'url'
import { Package, processPath } from 'utils'
import * as pkg from '../package.json' with { type: 'json' }
import { log, spinner } from '@/ui.js'
import { Database } from 'database'

Package.setData((pkg as unknown as { default: typeof pkg }).default)

export const { isPKG, root } = processPath(dirname(fileURLToPath(import.meta.url)))
export const API_URL = 'http://0.0.0.0:3500'

let accessToken: string | undefined
let refreshToken: string | undefined

export function setAccessToken(token: string | undefined): void {
  accessToken = token
  if (token) {
    import('./events/socket.js')
      .then(({ connectSocket }) => connectSocket(token))
      .catch(console.error)
  }
}

export function setRefreshToken(token: string | undefined): void {
  refreshToken = token
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => {
        const path = Array.isArray(op.path) ? op.path.join('.') : String(op.path)
        return path !== 'auth.discordExchange' && path !== 'auth.refresh'
      },
      true: httpBatchLink({
        url: `${API_URL}/trpc`,
        headers: () => ({ Authorization: accessToken ? `Bearer ${accessToken}` : undefined }),
      }),
      false: httpLink({
        url: `${API_URL}/trpc`,
        headers: ({ op }) => {
          const path = Array.isArray(op.path) ? op.path.join('.') : String(op.path)
          if (path === 'auth.refresh') {
            return { Authorization: refreshToken ? `Refresh ${refreshToken}` : undefined }
          }
          return { Authorization: accessToken ? `Bearer ${accessToken}` : undefined }
        },
      }),
    }),
  ],
})

export const database = new Database({
  root,
  log: (msg) => log.info(msg),
  spinner: (msg) => spinner(msg).start(),
})
