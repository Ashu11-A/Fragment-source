import type { FastifyInstance } from 'fastify'
import type { nodeContract, TypedSocketServer } from 'socket'
import { getAccessTokenFromHandshake } from '@/lib/socketHandshakeAuth.js'
import type { SocketData } from '@/socket/types.js'
import { repository } from '@/database/index.js'
import { nodeBridge } from '@/services/NodeBridge.js'
import { nodeBotTokenMissing } from '@/socket/events/node/botTokenMissing.js'
import { ping, serverStatusRequest } from '@/socket/events/dashboard/serverStatus.js'

export function setupNodeNamespace(
  fastify: FastifyInstance,
  io: TypedSocketServer<typeof nodeContract.serverToClient, typeof nodeContract.clientToServer>
) {
  // @ts-expect-error - using raw socket.io namespace for middleware
  io.io.use(async (socket, next) => {
    try {
      const token = getAccessTokenFromHandshake(
        socket.handshake.headers,
        socket.handshake.auth as { token?: unknown },
      )
      if (!token) return next(new Error('Authentication error'))

      const node = await repository.node.findOne({
        where: { token },
        relations: { bots: true },
      })
      if (node) {
        ;(socket.data as SocketData).node = node
        return next()
      }

      return next(new Error('Authentication error'))
    } catch (err) {
      fastify.log.error({ err }, '[socket:node] Auth exception in middleware')
      next(new Error('Authentication error'))
    }
  })

  const ctx = { fastify }

  io.onConnection((socket) => {
    const socketData = socket.data as SocketData
    const node = socketData.node!

    fastify.log.info(`[socket:node] Node ${node.id} (${node.name}) connected: ${socket.id}`)
    socket.join(`node:${node.id}`)
    nodeBridge.emitStatus(fastify, node.id)

    ping.register(socket as any, io as any, ctx)
    serverStatusRequest.register(socket as any, io as any, ctx)
    nodeBotTokenMissing.register(socket as any, io as any, { fastify })

    socket.onDisconnect(async (reason) => {
      fastify.log.info(`[socket:node] Node ${node.id} (${node.name}) disconnected: ${socket.id} (${reason})`)
      socket.leave(`node:${node.id}`)
      nodeBridge.emitStatus(fastify, node.id)
    })
  })
}
