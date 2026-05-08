import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import { toTrpcError } from '../_shared/errors.js'

const updateUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(120).optional(),
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  email: z.string().email().max(255).optional(),
  language: z.string().min(2).max(16).optional(),
  role: z.nativeEnum(Role).optional(),
  password: z.string().min(8).max(128).optional(),
})

export const updateUserProcedure = protectedProcedure
  .input(updateUserSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      if (ctx.user.role !== Role.Administrator && ctx.user.id !== input.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your own user.',
        })
      }

      if (ctx.user.role !== Role.Administrator && input.role && input.role !== ctx.user.role) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot change role.',
        })
      }

      const user = await User.findOne({ where: { id: input.id } })
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found.',
        })
      }

      if (input.email) {
        const normalizedEmail = input.email.toLowerCase().trim()
        const existing = await User.findOne({ where: { email: normalizedEmail } })
        if (existing && existing.id !== user.id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email is already in use.',
          })
        }
        user.email = normalizedEmail
      }

      if (input.username) {
        const normalizedUsername = input.username.trim()
        const existing = await User.findOne({ where: { username: normalizedUsername } })
        if (existing && existing.id !== user.id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Username is already in use.',
          })
        }
        user.username = normalizedUsername
      }

      if (input.name !== undefined) user.name = input.name.trim()
      if (input.language !== undefined) user.language = input.language
      if (input.role !== undefined && ctx.user.role === Role.Administrator) user.role = input.role
      if (input.password) await user.setPassword(input.password)

      await user.save()
      return user
    } catch (error) {
      throw toTrpcError(error, 'Could not update user')
    }
  })
