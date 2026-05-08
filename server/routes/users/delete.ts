import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import { toTrpcError } from '../_shared/errors.js'

const deleteUserSchema = z.object({
  id: z.number().int().positive(),
})

export const deleteUserProcedure = protectedProcedure
  .input(deleteUserSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      if (ctx.user.role !== Role.Administrator && ctx.user.id !== input.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own user.',
        })
      }

      const user = await User.findOne({ where: { id: input.id } })
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found.',
        })
      }

      await User.delete({ id: user.id })

      return {
        success: true,
        deletedId: user.id,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not delete user')
    }
  })
