import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import { protectedProcedure } from '@/trpc.js'

export const update = protectedProcedure
  .input(z.object({
    id: z.number().int().positive(),
    name: z.string().min(4).max(64).optional(),
    username: z.string().min(4).max(64).optional(),
    language: z.string().optional(),
    password: z.string().min(8).max(30).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    if (ctx.user.role === Role.User && ctx.user.id !== input.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only update your own user data' })
    }

    const user = await User.findOneBy({ id: input.id })
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: `User with ID ${input.id} not found` })

    if (input.name) user.name = input.name
    if (input.username) user.username = input.username
    if (input.language) user.language = input.language
    if (input.password) await user.setPassword(input.password)

    const result = await user.save()

    return { message: 'User updated successfully', data: { ...result, password: undefined } }
  })
