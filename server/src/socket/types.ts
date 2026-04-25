import type { FastifyInstance } from 'fastify'
import type { User } from '@/database/entity/User.js'

export type SocketData = {
  user?: User
  identifiedBotId?: number
  watchedBotIds?: number[]
  watchedConsoleBotIds?: number[]
}

export type SocketCtx = {
  fastify: FastifyInstance
}
