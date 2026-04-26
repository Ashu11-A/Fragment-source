import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import { protectedProcedure } from '@/trpc.js'

export const deleteUserProcedure = protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    if (ctx.user.role === Role.User && ctx.user.id !== input.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete your own account' })
    }

    const result = await User.delete({ id: input.id })
    if (result.affected === 0) throw new TRPCError({ code: 'NOT_FOUND', message: `User with ID ${input.id} not found` })

    return { message: 'User deleted successfully', data: result }
  })
