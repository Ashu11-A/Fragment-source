import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from 'server'

export type FragmentPlatformUser = inferRouterOutputs<AppRouter>['users']['profile']['data']
