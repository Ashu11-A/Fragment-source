import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { publicProcedure } from '@/trpc.js'
import { User } from '@/database/entity/User.js'
import { issueAuthSession } from '@/security/session.js'
import { toTrpcError } from '../_shared/errors.js'

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
})

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const user = await User.findOne({ where: { email: input.email.toLowerCase().trim() } })
      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials.',
        })
      }

      const validPassword = await user.validatePassword(input.password)
      if (!validPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials.',
        })
      }

      return issueAuthSession(user, ctx.res, ctx.req)
    } catch (error) {
      throw toTrpcError(error, 'Could not complete login')
    }
  })
