import type { FastifyInstance } from 'fastify'
import type { dashboardContract, TypedSocketServer } from 'socket'
import { getAccessTokenFromHandshake, authenticateUserFromAccessToken } from '@/lib/socketHandshakeAuth.js'
import type { SocketData } from '@/socket/types.js'
import { ping, serverStatusRequest } from '@/socket/events/dashboard/serverStatus.js'
import { dashboardActivitySubscribe, dashboardActivityUnsubscribe } from '@/socket/events/dashboard/dashboardActivity.js'
import { dashboardConsoleSubscribe, dashboardConsoleUnsubscribe } from '@/socket/events/dashboard/console.js'
import { dashboardRuntimeSubscribe, dashboardRuntimeUnsubscribe } from '@/socket/events/dashboard/runtime.js'
import { dashboardNodeStatusSubscribe, dashboardNodeStatusUnsubscribe } from '@/socket/events/dashboard/nodeStatus.js'
import { dashboardLicenseResponse } from '@/socket/events/dashboard/licenseResponse.js'
import { Bot } from '@/database/entity/Bot.js'
import { activity } from '@/services/Activity.js'

export function setupDashboardNamespace(
  fastify: FastifyInstance,
  io: TypedSocketServer<typeof dashboardContract.serverToClient, typeof dashboardContract.clientToServer>
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
      fastify.log.error({ err }, '[socket:dashboard] Auth exception in middleware')
      next(new Error('Authentication error'))
    }
  })

  const ctx = { fastify }

  io.onConnection((socket) => {
    const socketData = socket.data as SocketData
    fastify.log.info(`[socket:dashboard] Client connected: ${socket.id} (user ${socketData.user!.id})`)

    socketData.watchedBotIds = []
    socketData.watchedConsoleBotIds = []
    socketData.watchedRuntimeBotIds = []
    socketData.watchedNodeStatusIds = []

    ping.register(socket as any, io as any, ctx)
    serverStatusRequest.register(socket as any, io as any, ctx)
    dashboardActivitySubscribe.register(socket as any, io as any, ctx)
    dashboardActivityUnsubscribe.register(socket as any, io as any, ctx)
    dashboardConsoleSubscribe.register(socket as any, io as any, ctx)
    dashboardConsoleUnsubscribe.register(socket as any, io as any, ctx)
    dashboardRuntimeSubscribe.register(socket as any, io as any, ctx)
    dashboardRuntimeUnsubscribe.register(socket as any, io as any, ctx)
    dashboardNodeStatusSubscribe.register(socket as any, io as any, ctx)
    dashboardNodeStatusUnsubscribe.register(socket as any, io as any, ctx)
    dashboardLicenseResponse.register(socket as any, io as any, ctx)

    // Deliver any license requests that arrived while this user was offline.
    void (async () => {
      try {
        const userBots = await Bot.find({
          where: { user: { id: socketData.user!.id }, enabled: true },
          select: ['id'],
        })
        const pending = activity.getLicensesForBots(userBots.map((b) => b.id))
        for (const req of pending) {
          socket.emit('bot:license:request', req)
        }
      } catch (err) {
        fastify.log.error({ err }, '[socket:dashboard] Failed to deliver pending license requests on connect')
      }
    })()

    socket.onDisconnect((reason) => {
      fastify.log.info(`[socket:dashboard] Client disconnected: ${socket.id} (${reason})`)
      socketData.watchedBotIds = []
      socketData.watchedConsoleBotIds = []
      socketData.watchedRuntimeBotIds = []
      socketData.watchedNodeStatusIds = []
    })
  })
}
