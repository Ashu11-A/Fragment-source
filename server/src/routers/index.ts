import { router } from '../trpc.js'
import { artifactsRouter } from './artifacts.js'
import { authRouter } from './auth.js'
import { botsRouter } from './bots.js'
import { pluginsRouter } from './plugins.js'
import { statsRouter } from './stats.js'
import { subscriptionsRouter } from './subscriptions.js'
import { usersRouter } from './users.js'

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
