import { ServerEvent } from 'socket'
import { activity } from '@/services/Activity.js'
import { botRuntime } from '@/services/BotRuntime.js'
import type { SocketCtx, SocketData } from '@/socket/types.js'

export const coreRuntimeReport = new ServerEvent<'core:runtime:report', SocketCtx>({
  name: 'core:runtime:report',
  async onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const botId = socketData.identifiedBotId
    if (botId === undefined) {
      fastify.log.warn('[socket] core:runtime:report without client:identify - ignored')
      return
    }

    const user = socketData.user!
    const owns = await activity.assertOwnership(user, botId)
    if (!owns) {
      fastify.log.warn({ userId: user.id, botId }, '[socket] core:runtime:report bot not owned - ignored')
      return
    }

    botRuntime.upsertTelemetry(botId, {
      cpuUsagePercent: data.cpuUsagePercent,
      memoryUsageMb: data.memoryUsageMb,
      activePlugins: data.activePlugins,
    })

    await botRuntime.emitStats(fastify, botId)
  },
})
