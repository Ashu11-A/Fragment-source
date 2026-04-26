import { TRPCError } from '@trpc/server'
import { User } from '@/database/entity/User.js'
import { protectedProcedure } from '@/trpc.js'

export const profile = protectedProcedure
  .query(async ({ ctx }) => {
    const user = await User.findOne({ where: { id: ctx.user.id } })
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })

    return { message: 'Profile retrieved successfully', data: user }
  })
