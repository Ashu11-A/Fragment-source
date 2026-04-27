import { WebSocket } from 'ws'
import { z } from 'zod'

const messageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('node:register'),
    payload: z.object({
      token: z.string(),
      ip: z.string(),
      port: z.number(),
    }),
  }),
  z.object({
    type: z.literal('node:status'),
    payload: z.object({
      containers: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          status: z.enum(['running', 'stopped', 'error']),
          memoryUsage: z.number(),
          cpuUsage: z.number(),
        })
      ),
    }),
  }),
  z.object({
    type: z.literal('container:log'),
    payload: z.object({
      containerId: z.string(),
      lines: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.literal('command:create'),
    payload: z.object({
      containerId: z.string(),
      config: z.record(z.unknown()),
    }),
  }),
  z.object({
    type: z.literal('command:start'),
    payload: z.object({
      containerId: z.string(),
    }),
  }),
  z.object({
    type: z.literal('command:stop'),
    payload: z.object({
      containerId: z.string(),
    }),
  }),
  z.object({
    type: z.literal('command:restart'),
    payload: z.object({
      containerId: z.string(),
    }),
  }),
  z.object({
    type: z.literal('command:remove'),
    payload: z.object({
      containerId: z.string(),
    }),
  }),
])

type Message = z.infer<typeof messageSchema>

export interface NodeConfig {
  token: string
  ip: string
  port: number
  serverUrl: string
}

export class NodeWebSocketClient {
  private ws: WebSocket | null = null
  private readonly config: NodeConfig
  private reconnectTimer: NodeJS.Timeout | null = null
  private readonly messageHandlers = new Map<
    Message['type'],
    Array<(data: unknown) => void>
  >()

  constructor(config: NodeConfig) {
    this.config = config
  }

  connect(): void {
    this.ws = new WebSocket(this.config.serverUrl)

    this.ws.on('open', () => {
      console.log('[node:ws] Connected to server')
      this.send({
        type: 'node:register',
        payload: {
          token: this.config.token,
          ip: this.config.ip,
          port: this.config.port,
        },
      })
    })

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString())
        const validated = messageSchema.parse(message)
        this.handleMessage(validated)
      } catch (error) {
        console.error('[node:ws] Invalid message received:', error)
      }
    })

    this.ws.on('close', () => {
      console.log('[node:ws] Disconnected, reconnecting in 5s...')
      this.scheduleReconnect()
    })

    this.ws.on('error', (error) => {
      console.error('[node:ws] Connection error:', error)
    })
  }

  private handleMessage(message: Message): void {
    const handlers = this.messageHandlers.get(message.type)
    if (handlers) {
      for (const handler of handlers) {
        handler(message.payload)
      }
    }
  }

  on<T extends Message['type']>(
    type: T,
    handler: (data: Extract<Message, { type: T }>['payload']) => void
  ): void {
    const handlers = this.messageHandlers.get(type) || []
    handlers.push(handler as (data: unknown) => void)
    this.messageHandlers.set(type, handlers)
  }

  send(message: Message): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 5000)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
  }
}
