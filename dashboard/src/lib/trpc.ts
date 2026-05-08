import { createTRPCContext } from '@trpc/tanstack-react-query'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from 'server/routes/index'

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>()

export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>
