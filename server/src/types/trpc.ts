import type { FastifyReply, FastifyRequest } from 'fastify'
import type { User } from '@/database/entity/User.js'

export type Context = { user: User | null; req: FastifyRequest; res: FastifyReply }
