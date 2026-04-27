import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from '@/types/trpc.js'
import { Role } from '@/database/enums.js'

export type { Context } from '@/types/trpc.js'

const t = initTRPC.context<Context>().create()
export const router = t.router

const withLogging = t.middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now()
  try {
    const result = await next()
    ctx.req.log.info(`[trpc] ${type} ${path} OK ${Date.now() - start}ms`)
    return result
  } catch (err) {
    ctx.req.log.warn(`[trpc] ${type} ${path} ERR ${Date.now() - start}ms`)
    throw err
  }
})

const withAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.user } })
})

const withRole = (role: Role) => t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  if (ctx.user.role !== role) throw new TRPCError({ code: 'FORBIDDEN' })
  return next({ ctx: { ...ctx, user: ctx.user } })
})

const baseProcedure = t.procedure.use(withLogging)
export const publicProcedure = baseProcedure
export const protectedProcedure = baseProcedure.use(withAuth)
export const adminProcedure = baseProcedure.use(withRole(Role.Administrator))
