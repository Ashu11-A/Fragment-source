import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import { toTrpcError } from '../_shared/errors.js'

const getUserSchema = z.object({
  id: z.number().int().positive(),
})

export const getUserProcedure = protectedProcedure
  .input(getUserSchema)
  .query(async ({ input, ctx }) => {
    try {
      if (ctx.user.role !== Role.Administrator && ctx.user.id !== input.id) throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only access your own user.',
      })

      const user = await User.findOne({
        where: { id: input.id },
        relations: { bots: true, subscriptions: true, plugins: true },
      })

      if (!user) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found.',
      })

      return user
    } catch (error) {
      throw toTrpcError(error, 'Could not fetch user')
    }
  })
