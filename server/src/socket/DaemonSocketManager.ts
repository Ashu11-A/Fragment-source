import net from 'node:net'
import { randomUUID } from 'node:crypto'
import { DaemonConnection } from './DaemonConnection.js'
import type { EventMessage, ResponseMessage } from './protocol.js'

type EventHandler = (message: EventMessage, daemonId: string) => void;

export class DaemonSocketManager {
  private readonly tcpServer: net.Server
  private readonly activeConnections: Map<string, DaemonConnection> = new Map()
  // Mapeamento bidirecional entre nodeId e daemonId, preenchido após autenticação
  private readonly nodeIdToDaemonId: Map<number, string> = new Map()
  private readonly daemonIdToNodeId: Map<string, number> = new Map()
  private registeredEventHandler: EventHandler | null = null

  constructor(
    private readonly listenPort: number,
    private readonly bindAddress: string = '0.0.0.0',
  ) {
    this.tcpServer = net.createServer((incomingSocket) =>
      this.acceptDaemonConnection(incomingSocket),
    )
  }

  onDaemonEvent(handler: EventHandler): void {
    this.registeredEventHandler = handler
  }

  listen(): Promise<void> {
    return new Promise((resolve) => {
      this.tcpServer.listen(this.listenPort, this.bindAddress, () => {
        console.log(
          `[DaemonSocketManager] Aguardando conexões de daemons em ${this.bindAddress}:${this.listenPort}`,
        )
        resolve()
      })
    })
  }

  // Associa um daemonId autenticado ao seu nodeId do banco de dados
  registerNode(daemonId: string, nodeId: number): void {
    // Remove registro anterior deste nodeId caso o daemon tenha reconectado
    const previousDaemonId = this.nodeIdToDaemonId.get(nodeId)
    if (previousDaemonId && previousDaemonId !== daemonId) {
      this.daemonIdToNodeId.delete(previousDaemonId)
    }
    this.nodeIdToDaemonId.set(nodeId, daemonId)
    this.daemonIdToNodeId.set(daemonId, nodeId)
    console.log(`[DaemonSocketManager] Node ${nodeId} registrado para daemon ${daemonId}`)
  }

  isNodeOnline(nodeId: number): boolean {
    const daemonId = this.nodeIdToDaemonId.get(nodeId)
    return daemonId !== undefined && this.activeConnections.has(daemonId)
  }

  async sendNodeCommand(
    nodeId: number,
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<ResponseMessage> {
    const daemonId = this.nodeIdToDaemonId.get(nodeId)
    if (!daemonId || !this.activeConnections.has(daemonId)) {
      throw new Error(`Node ${nodeId} não está conectado`)
    }
    return this.activeConnections.get(daemonId)!.sendRequest(action, payload)
  }

  async sendCommand(
    daemonId: string,
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<ResponseMessage> {
    const targetConnection = this.activeConnections.get(daemonId)
    if (!targetConnection) {
      throw new Error(`Daemon '${daemonId}' não está conectado`)
    }
    return targetConnection.sendRequest(action, payload)
  }

  async broadcastCommand(
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<Map<string, ResponseMessage | Error>> {
    const results = new Map<string, ResponseMessage | Error>()
    const dispatchedPromises = Array.from(this.activeConnections.entries()).map(
      async ([daemonId, connection]) => {
        try {
          results.set(daemonId, await connection.sendRequest(action, payload))
        } catch (dispatchError) {
          results.set(
            daemonId,
            dispatchError instanceof Error ? dispatchError : new Error(String(dispatchError)),
          )
        }
      },
    )
    await Promise.allSettled(dispatchedPromises)
    return results
  }

  getConnectedDaemonIds(): string[] {
    return Array.from(this.activeConnections.keys())
  }

  getNodeIdForDaemon(daemonId: string): number | undefined {
    return this.daemonIdToNodeId.get(daemonId)
  }

  get connectionCount(): number {
    return this.activeConnections.size
  }

  async close(): Promise<void> {
    for (const connection of this.activeConnections.values()) {
      connection.destroy()
    }
    this.activeConnections.clear()
    this.nodeIdToDaemonId.clear()
    this.daemonIdToNodeId.clear()
    return new Promise((resolve, reject) => {
      this.tcpServer.close((closeError) => (closeError ? reject(closeError) : resolve()))
    })
  }

  private acceptDaemonConnection(incomingSocket: net.Socket): void {
    const newDaemonId = randomUUID()
    const newConnection = new DaemonConnection(
      newDaemonId,
      incomingSocket,
      (eventMessage, daemonId) => this.registeredEventHandler?.(eventMessage, daemonId),
      (disconnectedId) => this.handleDaemonDisconnect(disconnectedId),
    )

    this.activeConnections.set(newDaemonId, newConnection)
    console.log(
      `[DaemonSocketManager] Daemon conectado: ${newDaemonId} (total: ${this.activeConnections.size})`,
    )
  }

  private handleDaemonDisconnect(disconnectedDaemonId: string): void {
    // Remove o mapeamento nodeId ↔ daemonId ao desconectar
    const nodeId = this.daemonIdToNodeId.get(disconnectedDaemonId)
    if (nodeId !== undefined) {
      this.nodeIdToDaemonId.delete(nodeId)
      this.daemonIdToNodeId.delete(disconnectedDaemonId)
    }
    this.activeConnections.delete(disconnectedDaemonId)
    console.log(
      `[DaemonSocketManager] Daemon desconectado: ${disconnectedDaemonId} (restantes: ${this.activeConnections.size})`,
    )
  }
}
