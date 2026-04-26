import { TypedSocketServer, fragmentSocketContract } from 'socket'
import type { FastifyInstance } from 'fastify'
import { setupSocketMiddleware } from '../socket/middleware.js'
import { ping, serverStatusRequest } from '../socket/events/serverStatus.js'
import { clientIdentify } from '../socket/events/clientIdentify.js'
import { clientMessage } from '../socket/events/clientMessage.js'
import { pluginHealth } from '../socket/events/pluginHealth.js'
import { coreActivityReport } from '../socket/events/coreActivityReport.js'
import { dashboardActivitySubscribe, dashboardActivityUnsubscribe } from '../socket/events/dashboardActivity.js'
import { corePluginResult } from '../socket/events/corePluginResult.js'
import { coreConsolePush, dashboardConsoleSubscribe, dashboardConsoleUnsubscribe } from '../socket/events/botConsole.js'
import type { SocketData } from '../socket/types.js'

export let io: TypedSocketServer<typeof fragmentSocketContract.serverToClient, typeof fragmentSocketContract.clientToServer>

export function getIo() {
  if (io == null) throw new Error('Socket server not initialised')
  return io
}

export function setupSocketController(fastify: FastifyInstance) {
  io = new TypedSocketServer(fastify.io, fragmentSocketContract.clientToServer)

  setupSocketMiddleware(fastify)

  const ctx = { fastify }

  io.onConnection((socket) => {
    const socketData = socket.data as SocketData
    if (!socketData.user) {
      socket.onDisconnect(() => {})
      return
    }

    fastify.log.info(`[socket] Client connected: ${socket.id} (user ${socketData.user.id})`)
    socketData.watchedBotIds = []
    socketData.watchedConsoleBotIds = []

    ping.register(socket, io, ctx)
    serverStatusRequest.register(socket, io, ctx)
    clientIdentify.register(socket, io, ctx)
    clientMessage.register(socket, io, ctx)
    pluginHealth.register(socket, io, ctx)
    coreActivityReport.register(socket, io, ctx)
    dashboardActivitySubscribe.register(socket, io, ctx)
    dashboardActivityUnsubscribe.register(socket, io, ctx)
    corePluginResult.register(socket, io)
    coreConsolePush.register(socket, io, ctx)
    dashboardConsoleSubscribe.register(socket, io, ctx)
    dashboardConsoleUnsubscribe.register(socket, io, ctx)

    socket.onDisconnect((reason) => {
      fastify.log.info(`[socket] Client disconnected: ${socket.id} (${reason})`)
      socketData.watchedBotIds = []
      socketData.watchedConsoleBotIds = []
    })
  })
}
