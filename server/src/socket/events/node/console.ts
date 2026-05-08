import { ServerEvent } from 'socket'
import { botRuntime } from '@/services/BotRuntime.js'
import { activity } from '@/services/Activity.js'
import type { SocketCtx, SocketData } from '@/socket/types.js'

export const coreConsolePush = new ServerEvent<'core:console:push', SocketCtx>({
  name: 'core:console:push',
  async onRun({ data, socket, io }) {
    const socketData = socket.data as SocketData
    const botId = socketData.identifiedBotId
    if (botId === undefined) return

    const user = socketData.user!
    const owns = await activity.assertOwnership(user, botId)
    if (!owns) return

    botRuntime.console.append(botId, data.lines)
    io.to(`bot:${botId}:console`).emit('bot:console:lines', {
      lines: data.lines,
      mode: 'append',
    })
  },
})
