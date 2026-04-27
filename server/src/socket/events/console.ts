import { ServerEvent } from 'socket'
import { consoleBuffer } from '@/services/consoleBuffer.js'
import { assertOwnership } from '@/services/activity.js'
import type { SocketCtx, SocketData } from '@/socket/types.js'

export const coreConsolePush = new ServerEvent<'core:console:push', SocketCtx>({
  name: 'core:console:push',
  async onRun({ data, socket, io }) {
    const socketData = socket.data as SocketData
    const botId = socketData.identifiedBotId
    if (botId === undefined) return

    const user = socketData.user!
    const owns = await assertOwnership(user, botId)
    if (!owns) return

    consoleBuffer.append(botId, data.lines)
    io.to(`bot:${botId}:console`).emit('bot:console:lines', {
      lines: data.lines,
      mode: 'append',
    })
  },
})

export const dashboardConsoleSubscribe = new ServerEvent<'dashboard:console:subscribe', SocketCtx>({
  name: 'dashboard:console:subscribe',
  async onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const user = socketData.user!
    const owns = await assertOwnership(user, data.botId)
    if (!owns) {
      fastify.log.warn({ userId: user.id, botId: data.botId }, '[socket] console subscribe denied')
      return
    }
    const room = `bot:${data.botId}:console`
    void socket.join(room)
    if (!socketData.watchedConsoleBotIds!.includes(data.botId)) socketData.watchedConsoleBotIds!.push(data.botId)

    const snap = consoleBuffer.snapshot(data.botId, data.tailLines ?? 4000)
    if (snap.length > 0) {
      socket.emit('bot:console:lines', { lines: snap, mode: 'snapshot' })
    }
    fastify.log.info(`[socket] user ${user.id} subscribed to ${room}`)
  },
})

export const dashboardConsoleUnsubscribe = new ServerEvent<'dashboard:console:unsubscribe', SocketCtx>({
  name: 'dashboard:console:unsubscribe',
  onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const user = socketData.user!
    void socket.leave(`bot:${data.botId}:console`)
    socketData.watchedConsoleBotIds = socketData.watchedConsoleBotIds?.filter((id) => id !== data.botId) ?? []
    fastify.log.info(`[socket] user ${user.id} left bot:${data.botId}:console`)
  },
})
