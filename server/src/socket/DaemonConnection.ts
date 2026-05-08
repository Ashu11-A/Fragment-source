import type net from 'node:net'
import { randomUUID } from 'node:crypto'
import { MessageFramer } from './MessageFramer.js'
import type { DaemonMessage, EventMessage, RequestMessage, ResponseMessage } from './protocol.js'

type PendingRequest = {
  resolve: (response: ResponseMessage) => void;
  reject: (error: Error) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
};

type EventHandler = (message: EventMessage, daemonId: string) => void;
type DisconnectHandler = (daemonId: string) => void;

// Tempo máximo de espera por uma resposta antes de rejeitar a promessa
const REQUEST_TIMEOUT_MS = 30_000

export class DaemonConnection {
  readonly daemonId: string
  private readonly socket: net.Socket
  private readonly framer: MessageFramer
  private readonly pendingRequests: Map<string, PendingRequest> = new Map()
  private readonly onEvent: EventHandler
  private readonly onDisconnect: DisconnectHandler

  constructor(
    daemonId: string,
    socket: net.Socket,
    onEvent: EventHandler,
    onDisconnect: DisconnectHandler,
  ) {
    this.daemonId = daemonId
    this.socket = socket
    this.framer = new MessageFramer()
    this.onEvent = onEvent
    this.onDisconnect = onDisconnect

    this.socket.on('data', (incomingChunk: Buffer) => {
      const incomingMessages = this.framer.feed(incomingChunk)
      for (const incomingMessage of incomingMessages) {
        this.routeIncomingMessage(incomingMessage)
      }
    })

    this.socket.on('close', () => {
      this.rejectAllPending('Conexão com o daemon encerrada')
      this.onDisconnect(this.daemonId)
    })

    this.socket.on('error', (socketError: Error) => {
      // Erros de socket são resolvidos pelo evento 'close' subsequente
      console.error(`[DaemonConnection:${this.daemonId}] ${socketError.message}`)
    })
  }

  sendRequest(action: string, payload: Record<string, unknown> = {}): Promise<ResponseMessage> {
    const correlationId = randomUUID()
    const outgoingRequest: RequestMessage = {
      messageId: correlationId,
      type: 'request',
      action,
      payload,
      timestamp: Date.now(),
    }

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(correlationId)
        reject(new Error(`Timeout ao aguardar resposta para ação '${action}' (${correlationId})`))
      }, REQUEST_TIMEOUT_MS)

      this.pendingRequests.set(correlationId, { resolve, reject, timeoutHandle })
      this.writeFramed(outgoingRequest)
    })
  }

  destroy(): void {
    this.rejectAllPending('Conexão encerrada pelo servidor')
    this.socket.destroy()
  }

  private routeIncomingMessage(incomingMessage: DaemonMessage): void {
    if (incomingMessage.type === 'response') {
      const pendingRequest = this.pendingRequests.get(incomingMessage.messageId)
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeoutHandle)
        this.pendingRequests.delete(incomingMessage.messageId)
        pendingRequest.resolve(incomingMessage as ResponseMessage)
        return
      }
    }

    // Mensagens sem correlação (eventos do daemon) são encaminhadas ao gerenciador
    this.onEvent(incomingMessage as EventMessage, this.daemonId)
  }

  private writeFramed(outgoingMessage: DaemonMessage): void {
    this.socket.write(this.framer.frame(outgoingMessage))
  }

  private rejectAllPending(reason: string): void {
    const rejectionError = new Error(reason)
    for (const [correlationId, pendingRequest] of this.pendingRequests) {
      clearTimeout(pendingRequest.timeoutHandle)
      pendingRequest.reject(rejectionError)
      this.pendingRequests.delete(correlationId)
    }
  }
}
