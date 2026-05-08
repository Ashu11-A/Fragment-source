import { TRPCError } from '@trpc/server'
import type { FastifyInstance } from 'fastify'
import { repository } from '@/database/index.js'
import { daemonManager } from '@/singletons.js'
import type {
  NodeInstanceActionInput,
  NodeInstanceCreateInput,
  NodeInstanceResultPayload,
} from '@/types/nodeInstance.js'
import type {
  NodeBotInitializeInput,
  NodeBotInitializeResultPayload,
} from '@/types/nodeBotInitialize.js'
import type {
  NodeBotPluginInstallInput,
  NodeBotPluginInstallResultPayload,
} from '@/types/nodeBotPluginInstall.js'

export type NodeBotEnvUpdateInput = {
  botId: number
  containerName: string
  /** Complete env vars (FRAGMENT_LANGUAGE, plugin vars, bot custom vars, etc.).
   *  Runtime-injected vars (SERVER_URL, FRAGMENT_BOT_ID, DISCORD_TOKEN,
   *  FRAGMENT_ACCESS_TOKEN, FRAGMENT_REFRESH_TOKEN) are added by the daemon. */
  envVars: string[]
  tokenFetchUrl: string
}

type Log = FastifyInstance['log']

export class NodeBridge {
  /** Wait for the node to come online if daemons are connected but the node hasn't registered yet. */
  private async ensureOnline(nodeId: number): Promise<void> {
    if (!daemonManager.isNodeOnline(nodeId)) {
      if (daemonManager.connectionCount > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 3_000))
      }
      if (!daemonManager.isNodeOnline(nodeId)) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Node ${nodeId} is offline.`,
        })
      }
    }
  }

  async create(
    log: Log,
    nodeId: number,
    input: NodeInstanceCreateInput,
    _options?: { timeoutMs?: number },
  ): Promise<NodeInstanceResultPayload> {
    const node = await repository.node.findOne({ where: { id: nodeId } })
    if (!node) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Node with ID ${nodeId} not found`,
      })
    }

    await this.ensureOnline(nodeId)

    log.info(
      { nodeId, action: input.action, name: input.name, botId: input.botId },
      '[node:bridge] sending create via TCP',
    )

    const response = await daemonManager.sendNodeCommand(nodeId, 'containers/create', {
      requestId: crypto.randomUUID(),
      action: input.action,
      name: input.name,
      image: input.image ?? 'oven/bun:latest',
      botId: input.botId,
      pluginId: input.pluginId,
      pluginDeployUrl: input.pluginDeployUrl,
      tokenFetchUrl: input.tokenFetchUrl,
      startCommand: input.startCommand,
      envs: input.envs,
      ports: input.ports,
      memoryLimitMb: input.memoryLimitMb,
      cpuLimitPercentage: input.cpuLimitPercentage,
      files: input.files ?? [],
    })

    const succeeded = response.status === 'success'

    log.info(
      { nodeId, action: input.action, ok: succeeded },
      '[node:bridge] create result received',
    )

    return {
      requestId: 'tcp',
      ok: succeeded,
      action: input.action,
      message: succeeded ? 'Instance created' : response.error?.message,
      details: succeeded ? undefined : response.error?.message,
      instance: succeeded ? (response.data as NodeInstanceResultPayload['instance']) : undefined,
    }
  }

  async action(
    log: Log,
    nodeId: number,
    input: NodeInstanceActionInput,
    _options?: { timeoutMs?: number },
  ): Promise<NodeInstanceResultPayload> {
    const node = await repository.node.findOne({ where: { id: nodeId } })
    if (!node) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Node with ID ${nodeId} not found`,
      })
    }

    await this.ensureOnline(nodeId)

    log.info(
      { nodeId, action: input.action, name: input.name, botId: input.botId },
      '[node:bridge] sending action via TCP',
    )

    const tcpAction =
      input.action === 'start'
        ? 'containers/start'
        : input.action === 'stop'
          ? 'containers/stop'
          : 'containers/restart'

    const response = await daemonManager.sendNodeCommand(nodeId, tcpAction, {
      name: input.name,
      botId: input.botId,
    })

    const succeeded = response.status === 'success'

    log.info(
      { nodeId, action: input.action, ok: succeeded },
      '[node:bridge] action result received',
    )

    return {
      requestId: 'tcp',
      ok: succeeded,
      action: input.action,
      message: succeeded
        ? `Instance ${input.action} complete`
        : response.error?.message,
      details: succeeded ? undefined : response.error?.message,
    }
  }

  async initialize(
    log: Log,
    nodeId: number,
    input: NodeBotInitializeInput,
    _options?: { timeoutMs?: number },
  ): Promise<NodeBotInitializeResultPayload> {
    await this.ensureOnline(nodeId)

    log.info(
      { nodeId, botId: input.botId, containerName: input.containerName },
      '[node:bridge] sending initialize via TCP',
    )

    const response = await daemonManager.sendNodeCommand(nodeId, 'bot/initialize', {
      requestId: crypto.randomUUID(),
      botId: input.botId,
      containerName: input.containerName,
      tokenFetchUrl: input.tokenFetchUrl,
    })

    const succeeded = response.status === 'success'

    log.info(
      { nodeId, botId: input.botId, ok: succeeded },
      '[node:bridge] initialize result received',
    )

    if (!succeeded) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: response.error?.message ?? 'Bot initialization failed',
      })
    }

    return {
      requestId: 'tcp',
      ok: true,
      botId: input.botId,
      message: 'Bot initialized successfully',
    }
  }

  async installPlugin(
    log: Log,
    nodeId: number,
    input: NodeBotPluginInstallInput,
    _options?: { timeoutMs?: number },
  ): Promise<NodeBotPluginInstallResultPayload> {
    await this.ensureOnline(nodeId)

    log.info(
      { nodeId, botId: input.botId, containerName: input.containerName },
      '[node:bridge] sending plugin install via TCP',
    )

    const response = await daemonManager.sendNodeCommand(nodeId, 'bot/plugin/install', {
      requestId: crypto.randomUUID(),
      botId: input.botId,
      containerName: input.containerName,
      pluginDeployUrl: input.pluginDeployUrl,
      envVars: input.envs ?? [],
    })

    const succeeded = response.status === 'success'

    log.info(
      { nodeId, botId: input.botId, ok: succeeded },
      '[node:bridge] plugin install result received',
    )

    if (!succeeded) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: response.error?.message ?? 'Plugin installation failed',
      })
    }

    return {
      requestId: 'tcp',
      ok: true,
      botId: input.botId,
      message: 'Plugin env vars applied and container restarted',
    }
  }

  async updateEnv(
    log: Log,
    nodeId: number,
    input: NodeBotEnvUpdateInput,
  ): Promise<void> {
    await this.ensureOnline(nodeId)

    log.info(
      { nodeId, botId: input.botId, containerName: input.containerName, vars: input.envVars.length },
      '[node:bridge] sending env update via TCP',
    )

    const response = await daemonManager.sendNodeCommand(nodeId, 'bot/env/update', {
      requestId: crypto.randomUUID(),
      botId: input.botId,
      containerName: input.containerName,
      envVars: input.envVars,
      tokenFetchUrl: input.tokenFetchUrl,
    })

    if (response.status !== 'success') {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: response.error?.message ?? 'Env var update failed',
      })
    }

    log.info(
      { nodeId, botId: input.botId },
      '[node:bridge] container recreated with updated env vars',
    )
  }

  getStatus(fastify: FastifyInstance, nodeId: number) {
    const room = fastify.io.of('/node').adapter.rooms.get(`node:${nodeId}`)
    const activeConnections = room?.size ?? 0

    return {
      nodeId,
      online: activeConnections > 0,
      activeConnections,
      updatedAt: new Date().toISOString(),
    }
  }

  emitStatus(fastify: FastifyInstance, nodeId: number) {
    const status = this.getStatus(fastify, nodeId)
    fastify.io.to(`dashboard:node:${nodeId}:status`).emit('node:status', status)
    return status
  }
}

export const nodeBridge = new NodeBridge()
