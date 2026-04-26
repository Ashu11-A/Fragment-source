import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import { publicProcedure } from '@/trpc.js'

export const signup = publicProcedure
  .input(z.object({
    name: z.string().min(4).max(64),
    username: z.string().min(4).max(64),
    email: z.string().email(),
    language: z.string(),
    password: z.string().min(8).max(30),
  }))
  .mutation(async ({ input }) => {
    const existUser = await User.findOneBy({ email: input.email })
    if (existUser) throw new TRPCError({
      code: 'CONFLICT',
      message: 'A user with the provided email or username already exists. Please use different credentials.',
    })

    const user = await (await User.create({
      ...input,
      uuid: nanoid(),
      role: Role.User,
      discordId: null,
    }).setPassword(input.password)).save()

    return {
      message: 'User registered successfully!',
      data: { id: user.id, name: user.name, username: user.username, email: user.email },
    }
  })
