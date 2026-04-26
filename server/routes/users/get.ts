import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import { protectedProcedure } from '@/trpc.js'

export const get = protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input, ctx }) => {
    if (ctx.user.role === Role.User && ctx.user.id !== input.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only access your own user data' })
    }

    const user = await User.findOne({ where: { id: input.id } })
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: `User with ID ${input.id} not found` })

    return { message: 'User details retrieved successfully', data: user }
  })
