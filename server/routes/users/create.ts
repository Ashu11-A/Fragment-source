import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { adminProcedure } from '@/trpc.js'
import { User } from '@/database/entity/User.js'
import { Plan } from '@/database/entity/Plan.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { Role } from '@/database/enums.js'
import { toTrpcError } from '../_shared/errors.js'

const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  language: z.string().min(2).max(16).default('pt-BR'),
  role: z.nativeEnum(Role).default(Role.User),
})

export const createUserProcedure = adminProcedure
  .input(createUserSchema)
  .mutation(async ({ input }) => {
    try {
      const normalizedEmail = input.email.toLowerCase().trim()
      const normalizedUsername = input.username.trim()

      if (await User.findOne({ where: { email: normalizedEmail } })) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email is already in use.',
        })
      }

      if (await User.findOne({ where: { username: normalizedUsername } })) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Username is already in use.',
        })
      }

      const user = User.create({
        name: input.name.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        language: input.language,
        role: input.role,
      })

      await user.setPassword(input.password)
      await user.save()

      const freePlan = await Plan.findOne({ where: { key: 'free' } })
      if (freePlan) {
        const now = new Date()
        const expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        const subscription = Subscription.create({
          user: { id: user.id },
          plan: { id: freePlan.id },
          active: true,
          startAt: now,
          expiresAt,
        })
        await subscription.save()
      }

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not create user')
    }
  })
