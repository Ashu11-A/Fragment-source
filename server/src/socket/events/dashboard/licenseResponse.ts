import type { FastifyInstance } from 'fastify'
import { ServerEvent } from 'socket'
import { Bot } from '@/database/entity/Bot.js'
import { activity } from '@/services/Activity.js'
import { getCoreIo } from '@/socket/namespaces/index.js'
import type { SocketData } from '@/socket/types.js'

type Ctx = { fastify: FastifyInstance }

export const dashboardLicenseResponse = new ServerEvent<'dashboard:license:response', Ctx>({
  name: 'dashboard:license:response',
  async onRun({ data, ctx: { fastify }, socket }) {
    const socketData = socket.data as SocketData
    const user = socketData.user
    if (!user) return

    const bot = await Bot.findOne({ where: { id: data.botId, user: { id: user.id } } })
    if (!bot) {
      fastify.log.warn({ botId: data.botId, userId: user.id }, '[license] Bot not found or not owned by user')
      return
    }

    const pending = activity.getLicense(data.botId)

    bot.licenseAccepted = data.accepted
    bot.licenseAcceptedAt = data.accepted ? new Date() : null
    bot.licenseVersion = data.accepted ? (pending?.version ?? null) : null
    await bot.save()

    activity.clearLicense(data.botId)

    // Forward the result to the core process waiting in the bot room.
    getCoreIo().to(`bot:${data.botId}`).emit('bot:license:result', {
      botId: data.botId,
      accepted: data.accepted,
    })

    fastify.log.info({ botId: data.botId, accepted: data.accepted }, '[license] Response persisted and forwarded to core')
  },
})
