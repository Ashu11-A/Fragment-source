import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from 'server'

/** Payload emitido por `auth.login` e `auth.discordExchange` após `issueAuthSession`. */
export type AuthSessionPayload = inferRouterOutputs<AppRouter>['auth']['discordExchange']
