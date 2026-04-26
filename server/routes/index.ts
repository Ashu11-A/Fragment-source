import { router } from '@/trpc.js'
import { artifactsRouter } from './artifacts/index.js'
import { authRouter } from './auth/index.js'
import { botsRouter } from './bots/index.js'
import { pluginsRouter } from './plugins/index.js'
import { statsRouter } from './stats/index.js'
import { subscriptionsRouter } from './subscriptions/index.js'
import { usersRouter } from './users/index.js'

export const appRouter = router({
  auth: authRouter,
  artifacts: artifactsRouter,
  bots: botsRouter,
  users: usersRouter,
  plugins: pluginsRouter,
  stats: statsRouter,
  subscriptions: subscriptionsRouter,
})

export type AppRouter = typeof appRouter
