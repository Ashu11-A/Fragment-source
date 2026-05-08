import { router } from '@/trpc.js'
import { authRouter } from './auth/index.js'
import { botsRouter } from './bots/index.js'
import { nodesRouter } from './nodes/index.js'
import { pluginsRouter } from './plugins/index.js'
import { subscriptionsRouter } from './subscriptions/index.js'
import { usersRouter } from './users/index.js'
import { plansRouter } from './plans/index.js'
import { artifactsRouter } from './artifacts/index.js'
import { statsRouter } from './stats/index.js'
import { releasesRouter } from './releases/index.js'

export const appRouter = router({
  auth: authRouter,
  bots: botsRouter,
  nodes: nodesRouter,
  plugins: pluginsRouter,
  subscriptions: subscriptionsRouter,
  users: usersRouter,
  plans: plansRouter,
  artifacts: artifactsRouter,
  stats: statsRouter,
  releases: releasesRouter,
})

export type AppRouter = typeof appRouter
