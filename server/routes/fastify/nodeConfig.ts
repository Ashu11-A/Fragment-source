import type { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify'
import { Node } from '@/database/entity/Node.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { Bot } from '@/database/entity/Bot.js'
import { RequestStatus } from '@/database/enums.js'
import { decryptDiscordToken, hasDiscordToken } from '@/security/discordTokenCipher.js'
import { issueContainerSession } from '@/security/containerSession.js'
import { storage } from '@/singletons.js'

async function authenticateNode(request: FastifyRequest, nodeId: number): Promise<Node | null> {
  const authorizationHeader = request.headers.authorization
  const bearerToken = typeof authorizationHeader === 'string'
    ? authorizationHeader.replace(/^Bearer\s+/i, '').trim()
    : ''
  const queryToken = (request.query as { token?: unknown } | undefined)?.token
  const token = bearerToken || (typeof queryToken === 'string' ? queryToken.trim() : '')

  if (token.length === 0) return null

  return Node.findOne({ where: { id: nodeId, token }, relations: { bots: true } })
}

export default async function nodeRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  fastify.get('/api/node/:id/config', async (request, reply) => {
    const nodeId = Number((request.params as { id: string }).id)
    if (!Number.isInteger(nodeId) || nodeId <= 0) {
      return reply.status(400).send({ message: 'Invalid node id.' })
    }

    const node = await authenticateNode(request, nodeId)
    if (!node) {
      return reply.status(401).send({ message: 'Unauthorized node request.' })
    }

    return reply.send({
      id: node.id,
      name: node.name,
      maintenance: node.maintenance,
      network: {
        location: node.location,
      },
      resources: {
        memory: node.memory,
        memoryOverAllocationPercentage: node.memoryOverAllocationPercentage,
        disk: node.disk,
        diskOverAllocationPercentage: node.diskOverAllocationPercentage,
      },
      bots: node.bots.map((bot) => ({ id: bot.id, name: bot.name })),
    })
  })

  fastify.get('/api/node/:id/plugins/:pluginId/deploy', async (request, reply) => {
    const params = request.params as { id: string; pluginId: string }
    const nodeId = Number(params.id)
    const pluginId = Number(params.pluginId)

    if (!Number.isInteger(nodeId) || nodeId <= 0 || !Number.isInteger(pluginId) || pluginId <= 0) {
      return reply.status(400).send({ message: 'Invalid route params.' })
    }

    const node = await authenticateNode(request, nodeId)
    if (!node) {
      return reply.status(401).send({ message: 'Unauthorized node request.' })
    }

    const plugin = await Plugin.findOne({ where: { id: pluginId }, relations: { creator: true } })
    if (!plugin) {
      return reply.status(404).send({ message: 'Plugin not found.' })
    }

    const release = await PluginRelease.findOne({
      where: {
        plugin: { id: plugin.id },
        status: RequestStatus.Approved,
      },
      relations: { file: true },
      order: { createdAt: 'DESC' },
    })

    if (!release) {
      return reply.status(404).send({ message: 'No approved release available for this plugin.' })
    }

    const bundleBuffer = await storage.load(release.file.sha256)
    if (!bundleBuffer) {
      return reply.status(404).send({ message: 'Plugin bundle not found in storage.' })
    }

    return reply.send({
      plugin: {
        id: plugin.id,
        name: plugin.name,
        creatorId: plugin.creator.id,
        version: release.version,
        minReleaseVersion: release.minReleaseVersion,
      },
      bundle: {
        fileName: release.file.name,
        mimeType: release.file.mimeType,
        contentBase64: bundleBuffer.toString('base64'),
      },
    })
  })

  fastify.get('/api/node/:id/bots/:botId/token', async (request, reply) => {
    const params = request.params as { id: string; botId: string }
    const nodeId = Number(params.id)
    const botId = Number(params.botId)

    if (!Number.isInteger(nodeId) || nodeId <= 0 || !Number.isInteger(botId) || botId <= 0) {
      return reply.status(400).send({ message: 'Invalid route params.' })
    }

    const node = await authenticateNode(request, nodeId)
    if (!node) {
      return reply.status(401).send({ message: 'Unauthorized node request.' })
    }

    const bot = await Bot.findOne({
      where: { id: botId, node: { id: node.id } },
      relations: { node: true },
    })

    if (!bot) {
      return reply.status(404).send({ message: 'Bot not assigned to this node.' })
    }

    if (!hasDiscordToken(bot)) {
      return reply.status(404).send({ message: 'Bot does not have a stored Discord token.' })
    }

    const botWithUser = await Bot.findOne({ where: { id: bot.id }, relations: { user: true } })
    if (!botWithUser?.user) {
      return reply.status(404).send({ message: 'Bot owner not found.' })
    }

    try {
      const discordToken = await decryptDiscordToken(bot.token)
      const { accessToken, refreshToken } = await issueContainerSession(botWithUser.user, bot.id)
      return reply.send({ botId: bot.id, discordToken, accessToken, refreshToken })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not decrypt Discord token.'
      return reply.status(500).send({ message })
    }
  })
}
