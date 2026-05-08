import 'dotenv/config'
import 'env/loader'
import 'reflect-metadata'

import { join } from 'node:path'
import { Fastify } from '@/infra/fastify.js'
import Database from '@/database/dataSource.js'
import { registerArtifactRoutes } from '@/scripts/artifactRoutes.js'
import { registerFileRoutes } from '@/scripts/fileRoutes.js'
import { registerCrons } from '@/crons/index.js'
import { ActionRouter } from '@/router/ActionRouter.js'
import { onBotTokenMissing, onInstanceStatusChanged } from '@/router/handlers/container.js'
import { onDaemonReady } from '@/router/handlers/system.js'
import { repository } from '@/database/index.js'
import { Bot } from '@/database/entity/Bot.js'
import { Node } from '@/database/entity/Node.js'
import { hasDiscordToken } from '@/security/discordTokenCipher.js'
import { nodeBridge } from '@/services/NodeBridge.js'
import { botRuntime } from '@/services/BotRuntime.js'
import { pluginSync } from '@/services/PluginSync.js'
import { baseUrl, daemonManager } from '@/singletons.js'

const fastify = new Fastify({ port: Number(process.env['PORT']) || 3000, host: '0.0.0.0' })

console.log('[db] connecting...')
await Database.initialize()
console.log('[db] connected')

// Backfill PluginRelease.envs from releases/metadata.json for any releases created
// before env var definitions were tracked. Silent no-op when the file is absent.
void pluginSync.syncFromMetadata(join(import.meta.dirname, '../..'))

registerCrons()

const daemonEventRouter = new ActionRouter()

// Autenticação: daemon envia seu token → mapeamos daemonId → nodeId e reinjetamos tokens ausentes
daemonEventRouter.on('daemon/auth', async (payload, daemonId) => {
  const token = payload['token']
  if (typeof token !== 'string') return
  const node = await repository.node.findOne({ where: { token } })
  if (!node) {
    console.warn(`[daemon/auth] Token inválido recebido de daemon ${daemonId}`)
    return
  }
  daemonManager.registerNode(daemonId, node.id)

  // Após reconexão do daemon, inicializa bots que podem estar no modo de espera por token
  void initializePendingBots(node)
})

async function initializePendingBots(node: Node): Promise<void> {
  try {
    const enabledBots = await Bot.find({
      where: { node: { id: node.id }, enabled: true },
      relations: {
        node: true
      },
    })

    for (const bot of enabledBots) {
      if (!hasDiscordToken(bot)) continue

      const containerName = botRuntime.containerName(bot.id, node.id)
      const tokenFetchUrl = `${baseUrl}/api/node/${node.id}/bots/${bot.id}/token?token=${encodeURIComponent(node.token)}`

      try {
        console.log(`[daemon/auth] Reinjetando token no bot ${bot.id} (${containerName})`)
        await nodeBridge.initialize(console as never, node.id, { botId: bot.id, containerName, tokenFetchUrl })
      } catch (botError) {
        const message = botError instanceof Error ? botError.message : String(botError)
        console.warn(`[daemon/auth] Falha ao reinjetar token no bot ${bot.id}: ${message}`)
      }
    }
  } catch (error) {
    console.error('[daemon/auth] Erro ao inicializar bots pendentes:', error)
  }
}

daemonEventRouter.on('bot/token/missing', onBotTokenMissing)
daemonEventRouter.on('instance/status/changed', onInstanceStatusChanged)
daemonEventRouter.on('daemon/ready', onDaemonReady)

daemonManager.onDaemonEvent((message, daemonId) => daemonEventRouter.route(message, daemonId))
await daemonManager.listen()

fastify.config()
registerFileRoutes()
registerArtifactRoutes()
await fastify.listen()
