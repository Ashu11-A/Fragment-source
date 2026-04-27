import { DockerManager, ContainerConfig } from './docker/manager.js'
import { NodeWebSocketClient, NodeConfig } from './websocket/client.js'
import { LogAggregator } from './logging/aggregator.js'

interface NodeManagerOptions {
  nodeConfig: NodeConfig
  checkIntervalMs?: number
}

export class NodeManager {
  private readonly docker: DockerManager
  private readonly ws: NodeWebSocketClient
  private readonly logAggregator: LogAggregator
  private readonly checkIntervalMs: number
  private statusInterval: NodeJS.Timeout | null = null

  constructor(options: NodeManagerOptions) {
    this.docker = new DockerManager()
    this.ws = new NodeWebSocketClient(options.nodeConfig)
    this.logAggregator = new LogAggregator(this.docker)
    this.checkIntervalMs = options.checkIntervalMs || 30000
    this.setupHandlers()
  }

  private setupHandlers(): void {
    this.ws.on('command:create', async ({ containerId, config }) => {
      try {
        await this.docker.create(config as ContainerConfig)
        this.ws.send({
          type: 'node:status',
          payload: { containers: await this.getContainerStatus() },
        })
      } catch (error) {
        console.error(`[node] Failed to create container ${containerId}:`, error)
      }
    })

    this.ws.on('command:start', async ({ containerId }) => {
      try {
        await this.docker.start(containerId)
        this.startLogStreaming(containerId)
      } catch (error) {
        console.error(`[node] Failed to start container ${containerId}:`, error)
      }
    })

    this.ws.on('command:stop', async ({ containerId }) => {
      try {
        await this.docker.stop(containerId)
        this.stopLogStreaming(containerId)
      } catch (error) {
        console.error(`[node] Failed to stop container ${containerId}:`, error)
      }
    })

    this.ws.on('command:restart', async ({ containerId }) => {
      try {
        await this.docker.restart(containerId)
      } catch (error) {
        console.error(`[node] Failed to restart container ${containerId}:`, error)
      }
    })

    this.ws.on('command:remove', async ({ containerId }) => {
      try {
        await this.docker.remove(containerId)
        this.stopLogStreaming(containerId)
      } catch (error) {
        console.error(`[node] Failed to remove container ${containerId}:`, error)
      }
    })
  }

  async start(): Promise<void> {
    console.log('[node] Starting node manager...')
    this.ws.connect()
    this.startStatusReporting()
    await this.logAggregator.start()
  }

  stop(): void {
    this.statusInterval && clearInterval(this.statusInterval)
    this.logAggregator.stop()
    this.ws.disconnect()
  }

  private startStatusReporting(): void {
    this.statusInterval = setInterval(async () => {
      const containers = await this.getContainerStatus()
      this.ws.send({
        type: 'node:status',
        payload: { containers },
      })
    }, this.checkIntervalMs)
  }

  private async getContainerStatus(): Promise<
    Array<{
      id: string
      name: string
      status: 'running' | 'stopped' | 'error'
      memoryUsage: number
      cpuUsage: number
    }>
  > {
    const containers = await this.docker.list()
    return containers.map((container) => ({
      id: container.id,
      name: container.name,
      status: container.status,
      memoryUsage: container.memoryUsage,
      cpuUsage: container.cpuUsage,
    }))
  }

  private startLogStreaming(containerId: string): void {
    this.logAggregator.startStreaming(containerId, (lines) => {
      this.ws.send({
        type: 'container:log',
        payload: { containerId, lines },
      })
    })
  }

  private stopLogStreaming(containerId: string): void {
    this.logAggregator.stopStreaming(containerId)
  }
}
