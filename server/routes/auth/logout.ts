import { TRPCError } from '@trpc/server'
import { authTreeRepository } from '@/database/index.js'
import { protectedProcedure } from '@/trpc.js'

export const logout = protectedProcedure
  .mutation(async ({ ctx }) => {
    const token = ctx.req.headers['authorization'] ?? ctx.req.cookies?.['Bearer']
    if (!token) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token not provided' })

    const auth = await authTreeRepository.findOne({ where: { accessToken: token } })
    if (!auth) throw new TRPCError({ code: 'NOT_FOUND', message: 'Auth not found' })

    const ancestors = await authTreeRepository.findAncestors(auth)
    const descendants = await authTreeRepository.findDescendants(auth)
    const nodesToRemove = [...descendants, ...ancestors]

    await authTreeRepository.remove(nodesToRemove)
    await auth.remove()

    return { message: 'Logout successful, tokens removed.' }
  })
