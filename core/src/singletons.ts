import { state } from '@/utils/config.js'
import { isPKG, root } from '@/utils/paths'
import { log, spinner } from '@/utils/ui.js'
import { createTRPCClient, httpBatchLink, httpLink, splitLink } from '@trpc/client'
import { Database } from 'database'
import type { AppRouter } from 'server'

export { i18, lang } from '@/utils/lang.js'
export { storage } from '@/utils/storage.js'
export { state, isPKG, root }

export const API_URL = process.env.SERVER_URL || 'http://0.0.0.0:3500'
export const trpc = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => {
        const path = Array.isArray(op.path) ? op.path.join('.') : String(op.path)
        return path !== 'auth.discordExchange' && path !== 'auth.refresh'
      },
      true: httpBatchLink({
        url: `${API_URL}/trpc`,
        headers: () => ({ Authorization: state.accessToken ? `Bearer ${state.accessToken}` : undefined }),
      }),
      false: httpLink({
        url: `${API_URL}/trpc`,
        headers: ({ op }) => {
          const path = Array.isArray(op.path) ? op.path.join('.') : String(op.path)
          if (path === 'auth.refresh') {
            return { Authorization: state.refreshToken ? `Refresh ${state.refreshToken}` : undefined }
          }
          return { Authorization: state.accessToken ? `Bearer ${state.accessToken}` : undefined }
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
