import type { FastifyInstance } from 'fastify'
import type { User } from '@/database/entity/User.js'
import type { Node } from '@/database/entity/Node.js'

export type SocketData = {
  user?: User
  node?: Node
  identifiedBotId?: number
  watchedBotIds?: number[]
  watchedConsoleBotIds?: number[]
  watchedRuntimeBotIds?: number[]
  watchedNodeStatusIds?: number[]
}

export type SocketCtx = {
  fastify: FastifyInstance
}
