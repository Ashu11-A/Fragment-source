import { ServerEvent } from 'socket'
import { activity } from '@/services/Activity.js'
import type { SocketCtx, SocketData } from '@/socket/types.js'

export const activityReport = new ServerEvent<'core:activity:report', SocketCtx>({
  name: 'core:activity:report',
  async onRun({ data, socket, io, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const botId = socketData.identifiedBotId
    if (botId === undefined) {
      fastify.log.warn('[socket] core:activity:report without client:identify — ignored')
      return
    }

    const user = socketData.user!
    const owns = await activity.assertOwnership(user, botId)
    if (!owns) {
      fastify.log.warn({ userId: user.id, botId }, '[socket] core:activity:report bot not owned — ignored')
      return
    }

    try {
      const row = await activity.record(fastify.log, {
        botId,
        level: data.level,
        category: data.category,
        message: data.message,
        display: data.display,
        metadata: data.metadata,
        source: data.source,
      })
      io.to(`bot:${botId}:activity`).emit('bot:activity', activity.toPayload(row))
    } catch (err) {
      fastify.log.error({ err, botId }, '[socket] failed to record bot activity')
    }
  },
})
