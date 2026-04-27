import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import { adminProcedure } from '@/trpc.js'

export const create = adminProcedure
  .input(z.object({
    name: z.string().min(4).max(64),
    username: z.string().min(4).max(64),
    email: z.string().email(),
    language: z.string(),
    password: z.string().min(8).max(30),
    role: z.nativeEnum(Role),
  }))
  .mutation(async ({ input, ctx }) => {
    if (ctx.user.role === Role.Administrator && input.role !== Role.User) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Administradores só podem criar usuários com função de Employee.' })
    }

    const existUser = await User.findOneBy({ email: input.email })
    if (existUser) throw new TRPCError({ code: 'CONFLICT', message: 'Um usuário com este email já existe no sistema.' })

    const user = await (await User.create({ ...input }).setPassword(input.password)).save()

    return {
      message: 'Usuário criado com sucesso!',
      data: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role },
    }
  })
