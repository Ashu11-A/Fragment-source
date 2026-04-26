import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { issueAuthSession } from '@/security/session.js'
import { repository } from '@/database/index.js'
import { publicProcedure } from '@/trpc.js'

export const login = publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }))
  .mutation(async ({ input, ctx }) => {
    const user = await repository.user
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: input.email })
      .getOne()
    if (!user) throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid email or password' })

    if (user.password == null) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This account uses Discord sign-in. Please log in with Discord.',
      })
    }

    const valid = await user.validatePassword(input.password)
    if (!valid) throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid email or password' })

    return await issueAuthSession(user, ctx.res)
  })
