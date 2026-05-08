import { authenticateUserFromAccessToken, getAccessTokenFromHandshake } from '@/lib/socketHandshakeAuth.js'
import { botRuntime } from '@/services/BotRuntime.js'
import { ping, serverStatusRequest } from '@/socket/events/dashboard/serverStatus.js'
import { activityReport } from '@/socket/events/node/activityReport.js'
import { clientIdentify } from '@/socket/events/node/clientIdentify.js'
import { clientMessage } from '@/socket/events/node/clientMessage.js'
import { coreConsolePush } from '@/socket/events/node/console.js'
import { coreLicenseRequest } from '@/socket/events/node/licenseRequest.js'
import { pluginHealth } from '@/socket/events/node/pluginHealth.js'
import { corePluginResult } from '@/socket/events/node/pluginResult.js'
import { coreRuntimeReport } from '@/socket/events/node/runtimeReport.js'
import type { SocketData } from '@/socket/types.js'
import type { FastifyInstance } from 'fastify'
import type { coreContract, TypedSocketServer } from 'socket'

export function setupCoreNamespace(
  fastify: FastifyInstance,
  io: TypedSocketServer<typeof coreContract.serverToClient, typeof coreContract.clientToServer>
) {
  // @ts-expect-error - using raw socket.io namespace for middleware
  io.io.use(async (socket, next) => {
    try {
      const token = getAccessTokenFromHandshake(
        socket.handshake.headers,
        socket.handshake.auth as { token?: unknown },
      )
      if (!token) return next(new Error('Authentication error'))

      const user = await authenticateUserFromAccessToken(token)
      if (user) {
        ;(socket.data as SocketData).user = user
        return next()
      }

      return next(new Error('Authentication error'))
    } catch (err) {
      fastify.log.error({ err }, '[socket:core] Auth exception in middleware')
      next(new Error('Authentication error'))
    }
  })

  const ctx = { fastify }

  io.onConnection((socket) => {
    const socketData = socket.data as SocketData
    fastify.log.info(`[socket:core] Client connected: ${socket.id} (user ${socketData.user!.id})`)

    ping.register(socket as any, io as any, ctx)
    serverStatusRequest.register(socket as any, io as any, ctx)
    clientIdentify.register(socket as any, io as any, ctx)
    clientMessage.register(socket as any, io as any, ctx)
    pluginHealth.register(socket as any, io as any, ctx)
    activityReport.register(socket as any, io as any, ctx)
    corePluginResult.register(socket as any, io as any)
    coreConsolePush.register(socket as any, io as any, ctx)
    coreRuntimeReport.register(socket as any, io as any, ctx)
    coreLicenseRequest.register(socket as any, io as any, ctx)

    socket.onDisconnect((reason) => {
      fastify.log.info(`[socket:core] Client disconnected: ${socket.id} (${reason})`)
      const botId = socketData.identifiedBotId
      if (botId !== undefined) {
        void botRuntime.emitStats(fastify, botId)
      }
    })
  })
}
