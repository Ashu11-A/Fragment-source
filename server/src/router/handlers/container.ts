import { Bot } from '@/database/entity/Bot.js'
import { Node } from '@/database/entity/Node.js'
import { hasDiscordToken } from '@/security/discordTokenCipher.js'
import { nodeBridge } from '@/services/NodeBridge.js'
import { baseUrl, daemonManager } from '@/singletons.js'
import type { DaemonEventHandler } from '@/socket/protocol.js'

// Recebido quando o daemon inicia um container de bot sem DISCORD_TOKEN configurado
export const onBotTokenMissing: DaemonEventHandler = async (payload, daemonId) => {
  const botId = payload['botId'] as number | undefined
  const containerName = payload['containerName'] as string | undefined

  if (!botId || !containerName) {
    console.warn('[container] bot/token/missing: payload incompleto', payload)
    return
  }

  // Descobre qual nodeId está associado a este daemonId
  const nodeId = daemonManager.getNodeIdForDaemon(daemonId)
  if (nodeId === undefined) {
    console.warn(`[container] bot/token/missing: daemon ${daemonId} ainda não autenticado`)
    return
  }

  const [node, bot] = await Promise.all([
    Node.findOne({ where: { id: nodeId } }),
    Bot.findOne({ where: { id: botId, node: { id: nodeId } }, relations: { node: true } }),
  ])

  if (!node || !bot) {
    console.warn(`[container] bot/token/missing: bot ${botId} ou node ${nodeId} não encontrado`)
    return
  }

  if (!hasDiscordToken(bot)) {
    console.info(
      `[container] bot/token/missing: bot ${botId} não tem token armazenado — aguardando bots.initialize`,
    )
    return
  }

  const tokenFetchUrl = `${baseUrl}/api/node/${nodeId}/bots/${bot.id}/token?token=${encodeURIComponent(node.token)}`

  try {
    console.info(`[container] bot/token/missing: inicializando bot ${botId} no container '${containerName}'`)
    await nodeBridge.initialize(console as never, nodeId, {
      botId: bot.id,
      containerName,
      tokenFetchUrl,
    })
    console.info(`[container] bot/token/missing: bot ${botId} inicializado com sucesso`)
  } catch (initError) {
    const message = initError instanceof Error ? initError.message : String(initError)
    console.error(`[container] bot/token/missing: falha ao inicializar bot ${botId}: ${message}`)
  }
}

// Evento emitido pelo daemon quando o estado de uma instância muda
export const onInstanceStatusChanged: DaemonEventHandler = async (payload, daemonId) => {
  const instanceName = payload['instanceName']
  const newStatus = payload['status']
  console.info(`[container] Daemon ${daemonId}: instância '${instanceName}' agora está '${newStatus}'`)
}
