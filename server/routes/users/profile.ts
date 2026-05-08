import { protectedProcedure } from '@/trpc.js'
import { User } from '@/database/entity/User.js'
import { toTrpcError } from '../_shared/errors.js'

export const profileProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    try {
      const user = await User.findOneBy({ id: ctx.user.id })

      return user ?? ctx.user
    } catch (error) {
      throw toTrpcError(error, 'Could not fetch profile')
    }
  })
