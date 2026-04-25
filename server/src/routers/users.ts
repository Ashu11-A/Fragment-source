import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { User } from '../database/entity/User.js'
import { repository } from '../database/index.js'
import { paginate, paginateSchema } from '../database/pagination.js'
import { Role } from '../database/enums.js'
import { adminProcedure, protectedProcedure, publicProcedure, router } from '../trpc.js'

export const usersRouter = router({
  list: adminProcedure
    .input(paginateSchema)
    .query(async ({ input }) => {
      const paginated = await paginate({
        repository: repository.user,
        page: input.page,
        pageSize: input.pageSize,
        interval: input.interval,
        day: input.day,
        orderBy: input.orderBy,
        orderDirection: input.orderDirection,
        relations: { auths: false },
      })

      return { message: 'Users retrieved successfully', ...paginated }
    }),

  profile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await User.findOne({ where: { id: ctx.user.id } })
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })

      return { message: 'Profile retrieved successfully', data: user }
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role === Role.User && ctx.user.id !== input.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only access your own user data' })
      }

      const user = await User.findOne({ where: { id: input.id } })
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: `User with ID ${input.id} not found` })

      return { message: 'User details retrieved successfully', data: user }
    }),

  create: adminProcedure
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

      const user = await (await User.create({ ...input, uuid: nanoid() }).setPassword(input.password)).save()

      return {
        message: 'Usuário criado com sucesso!',
        data: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role },
      }
    }),

  update: protectedProcedure
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
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role === Role.User && ctx.user.id !== input.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete your own account' })
      }

      const result = await User.delete({ id: input.id })
      if (result.affected === 0) throw new TRPCError({ code: 'NOT_FOUND', message: `User with ID ${input.id} not found` })

      return { message: 'User deleted successfully', data: result }
    }),
})
