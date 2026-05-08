import { ServerEvent } from 'socket'
import { activity } from '@/services/Activity.js'
import { botRuntime } from '@/services/BotRuntime.js'
import type { SocketCtx, SocketData } from '@/socket/types.js'

export const dashboardRuntimeSubscribe = new ServerEvent<'dashboard:runtime:subscribe', SocketCtx>({
  name: 'dashboard:runtime:subscribe',
  async onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const user = socketData.user!
    const owns = await activity.assertOwnership(user, data.botId)
    if (!owns) {
      fastify.log.warn({ userId: user.id, botId: data.botId }, '[socket] runtime subscribe denied')
      return
    }

    const room = `bot:${data.botId}:runtime`
    void socket.join(room)
    if (!socketData.watchedRuntimeBotIds!.includes(data.botId)) socketData.watchedRuntimeBotIds!.push(data.botId)

    const snapshot = await botRuntime.getStats(fastify, data.botId)
    if (snapshot) socket.emit('bot:runtime:stats', snapshot)

    fastify.log.info(`[socket] user ${user.id} subscribed to ${room}`)
  },
})

export const dashboardRuntimeUnsubscribe = new ServerEvent<'dashboard:runtime:unsubscribe', SocketCtx>({
  name: 'dashboard:runtime:unsubscribe',
  onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const user = socketData.user!
    void socket.leave(`bot:${data.botId}:runtime`)
    socketData.watchedRuntimeBotIds = socketData.watchedRuntimeBotIds?.filter((id) => id !== data.botId) ?? []
    fastify.log.info(`[socket] user ${user.id} left bot:${data.botId}:runtime`)
  },
})
