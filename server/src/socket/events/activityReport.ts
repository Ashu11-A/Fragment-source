import { ServerEvent } from 'socket'
import { assertOwnership, record, toSocketPayload } from '@/services/activity.js'
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
    const owns = await assertOwnership(user, botId)
    if (!owns) {
      fastify.log.warn({ userId: user.id, botId }, '[socket] core:activity:report bot not owned — ignored')
      return
    }

    try {
      const row = await record(fastify.log, {
        botId,
        level: data.level,
        category: data.category,
        message: data.message,
        display: data.display,
        metadata: data.metadata,
        source: data.source,
        correlationId: data.correlationId,
      })
      io.to(`bot:${botId}:activity`).emit('bot:activity', toSocketPayload(row))
    } catch (err) {
      fastify.log.error({ err, botId }, '[socket] failed to record bot activity')
    }
  },
})
