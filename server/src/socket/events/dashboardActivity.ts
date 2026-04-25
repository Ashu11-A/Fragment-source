import { ServerEvent } from 'socket'
import { assertUserOwnsBot } from '@/services/botActivity.js'
import type { SocketCtx, SocketData } from '../types.js'

export const dashboardActivitySubscribe = new ServerEvent<'dashboard:activity:subscribe', SocketCtx>({
  name: 'dashboard:activity:subscribe',
  async onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const user = socketData.user!
    const owns = await assertUserOwnsBot(user, data.botId)
    if (!owns) {
      fastify.log.warn({ userId: user.id, botId: data.botId }, '[socket] activity subscribe denied')
      return
    }
    const room = `bot:${data.botId}:activity`
    void socket.join(room)
    if (!socketData.watchedBotIds!.includes(data.botId)) socketData.watchedBotIds!.push(data.botId)
    fastify.log.info(`[socket] user ${user.id} subscribed to ${room}`)
  },
})

export const dashboardActivityUnsubscribe = new ServerEvent<'dashboard:activity:unsubscribe', SocketCtx>({
  name: 'dashboard:activity:unsubscribe',
  onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const user = socketData.user!
    const room = `bot:${data.botId}:activity`
    void socket.leave(room)
    socketData.watchedBotIds = socketData.watchedBotIds?.filter((id) => id !== data.botId) ?? []
    fastify.log.info(`[socket] user ${user.id} left ${room}`)
  },
})
