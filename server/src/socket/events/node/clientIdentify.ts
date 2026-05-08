import { ServerEvent } from 'socket'
import { botRuntime } from '@/services/BotRuntime.js'
import type { SocketCtx, SocketData } from '@/socket/types.js'

export const clientIdentify = new ServerEvent<'client:identify', SocketCtx>({
  name: 'client:identify',
  async onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const prev = socketData.identifiedBotId
    if (prev !== undefined && prev !== data.botId) {
      void socket.leave(`bot:${prev}`)
    }
    socketData.identifiedBotId = data.botId
    void socket.join(`bot:${data.botId}`)
    fastify.log.info(`[socket] Client identified as bot ${data.botId} (v${data.version ?? 'unknown'})`)

    await botRuntime.emitStats(fastify, data.botId)
  },
})
