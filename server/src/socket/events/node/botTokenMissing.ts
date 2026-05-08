import type { FastifyInstance } from 'fastify'
import { ServerEvent } from 'socket'
import { Bot } from '@/database/entity/Bot.js'
import { Node } from '@/database/entity/Node.js'
import { hasDiscordToken } from '@/security/discordTokenCipher.js'
import { nodeBridge } from '@/services/NodeBridge.js'
import { baseUrl } from '@/singletons.js'
import type { SocketData } from '@/socket/types.js'

export const nodeBotTokenMissing = new ServerEvent<'node:bot:token:missing', { fastify: FastifyInstance }>({
  name: 'node:bot:token:missing',
  async onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const nodeId = socketData.node?.id
    if (!nodeId) return

    const [node, bot] = await Promise.all([
      Node.findOne({ where: { id: nodeId } }),
      Bot.findOne({ where: { id: data.botId, node: { id: nodeId } }, relations: { node: true } }),
    ])

    if (!node || !bot) {
      fastify.log.warn({ botId: data.botId, nodeId }, '[node:bot:token:missing] bot or node not found')
      return
    }

    if (!hasDiscordToken(bot)) {
      fastify.log.info(
        { botId: data.botId, nodeId },
        '[node:bot:token:missing] bot has no stored token — user must call bots.initialize first',
      )
      return
    }

    const tokenFetchUrl = `${baseUrl}/api/node/${nodeId}/bots/${bot.id}/token?token=${encodeURIComponent(node.token)}`

    try {
      fastify.log.info({ botId: data.botId, nodeId, containerName: data.containerName }, '[node:bot:token:missing] auto-initializing bot')
      await nodeBridge.initialize(fastify.log, nodeId, {
        botId: bot.id,
        containerName: data.containerName,
        tokenFetchUrl,
      })
      fastify.log.info({ botId: data.botId, nodeId }, '[node:bot:token:missing] bot initialized successfully')
    } catch (error) {
      fastify.log.error(
        { botId: data.botId, nodeId, error: error instanceof Error ? error.message : String(error) },
        '[node:bot:token:missing] auto-initialization failed',
      )
    }
  },
})
