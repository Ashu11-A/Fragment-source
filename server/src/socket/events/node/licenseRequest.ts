import type { FastifyInstance } from 'fastify'
import { ServerEvent } from 'socket'
import { Bot } from '@/database/entity/Bot.js'
import { activity } from '@/services/Activity.js'
import type { SocketData } from '@/socket/types.js'

type Ctx = { fastify: FastifyInstance }

export const coreLicenseRequest = new ServerEvent<'core:license:request', Ctx>({
  name: 'core:license:request',
  async onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const user = socketData.user
    if (!user) return

    const bot = await Bot.findOne({ where: { id: data.botId, user: { id: user.id } } })
    if (!bot) {
      fastify.log.warn({ botId: data.botId, userId: user.id }, '[license] Bot not found or not owned by user')
      return
    }

    // Fast path: already accepted — respond immediately without bothering the user.
    if (bot.licenseAccepted) {
      socket.emit('bot:license:result', { botId: bot.id, accepted: true })
      return
    }

    activity.storeLicense({
      botId: bot.id,
      licenseText: data.licenseText,
      language: data.language,
      version: data.version,
    })

    // Forward to every dashboard session for this user that is currently connected.
    let delivered = 0
    for (const [, s] of fastify.io.sockets.sockets) {
      const d = s.data as SocketData
      if (d.user?.id === user.id && d.identifiedBotId === undefined) {
        s.emit('bot:license:request', {
          botId: bot.id,
          licenseText: data.licenseText,
          language: data.language,
          version: data.version,
        })
        delivered++
      }
    }

    fastify.log.info(
      { botId: bot.id, delivered },
      delivered > 0
        ? '[license] Request forwarded to dashboard'
        : '[license] User offline — request queued',
    )
  },
})
