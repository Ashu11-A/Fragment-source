import type { z } from 'zod'
import type { EventSchemaMap, InferEventMap } from './types/index.js'
import type { IoClientSocket } from './types/client.js'

// ─── Typed client wrapper ────────────────────────────────────────────────────

/**
 * A fully typed socket.io-client wrapper.
 *
 * Usage:
 * ```ts
 * const client = new TypedSocketClient(rawSocket, contract.serverToClient)
 *
 * // Listen for server→client events (typed + validated)
 * client.on('server:status', (data) => {
 *   console.log(data.status)   // ← autocomplete works!
 * })
 *
 * // Emit client→server events (typed)
 * client.emit('ping')
 * client.emit('client:identify', { botId: 42 })
 * ```
 */
export class TypedSocketClient<
  StoC extends EventSchemaMap,
  CtoS extends EventSchemaMap,
> {
  private connectionHandlers: Array<() => void> = []
  private disconnectionHandlers: Array<(reason: string) => void> = []
  private errorHandlers: Array<(error: Error) => void> = []

  constructor(
    private readonly raw: IoClientSocket<InferEventMap<StoC>, InferEventMap<CtoS>>,
    private readonly serverSchemas: StoC,
  ) {
    this.raw.on('connect', () => {
      for (const h of this.connectionHandlers) h()
    })

    this.raw.on('disconnect', (reason: string) => {
      for (const h of this.disconnectionHandlers) h(reason)
    })

    this.raw.on('connect_error', (error: Error) => {
      for (const h of this.errorHandlers) h(error)
    })
  }

  // ── Connection state ─────────────────────────────────────────────────────

  /** Socket ID (available after connection) */
  get id(): string | undefined {
    return this.raw.id
  }

  /** Whether the socket is currently connected */
  get connected(): boolean {
    return this.raw.connected
  }

  /** Manually connect */
  connect(): this {
    this.raw.connect()
    return this
  }

  /** Manually disconnect */
  disconnect(): this {
    this.raw.disconnect()
    return this
  }

  // ── Lifecycle hooks ──────────────────────────────────────────────────────

  /** Fires when the socket connects / reconnects */
  onConnect(handler: () => void): this {
    this.connectionHandlers.push(handler)
    return this
  }

  /** Fires when the socket disconnects */
  onDisconnect(handler: (reason: string) => void): this {
    this.disconnectionHandlers.push(handler)
    return this
  }

  /** Fires on connection errors */
  onError(handler: (error: Error) => void): this {
    this.errorHandlers.push(handler)
    return this
  }

  /** Fires on successful reconnect */
  onReconnect(handler: (attempt: number) => void): this {
    this.raw.io.on('reconnect', handler)
    return this
  }

  // ── Events ───────────────────────────────────────────────────────────────

  /**
   * Listen for a server→client event with runtime Zod validation.
   */
  on<K extends string & keyof StoC>(
    event: K,
    handler: StoC[K] extends z.ZodVoid
      ? () => void | Promise<void>
      : (data: z.infer<StoC[K]>) => void | Promise<void>,
  ): this {
    const schema = this.serverSchemas[event]

    this.raw.on(event, ((...args: unknown[]) => {
      const raw = args[0]
      const result = schema.safeParse(raw)
      if (!result.success) {
        console.warn(`[socket:client] validation failed for "${String(event)}":`, result.error.format())
        return
      }
      ;(handler as (...a: unknown[]) => void)(result.data)
    }) as InferEventMap<StoC>[K])

    return this
  }

  /**
   * Remove a listener for a server→client event.
   */
  off<K extends string & keyof StoC>(event: K): this {
    this.raw.off(event)
    return this
  }

  /**
   * Emit a client→server event with full type safety.
   */
  emit<K extends string & keyof CtoS>(
    event: K,
    ...args: CtoS[K] extends z.ZodVoid
      ? []
      : [data: z.infer<CtoS[K]>]
  ): this {
    this.raw.emit(event, ...(args as Parameters<InferEventMap<CtoS>[K]>))
    return this
  }

  /**
   * Wait for the socket to connect. Resolves immediately if already connected.
   */
  waitForConnection(timeoutMs: number = 10_000): Promise<void> {
    if (this.raw.connected) return Promise.resolve()

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[socket:client] connection timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      const handler = () => {
        clearTimeout(timer)
        resolve()
      }

      this.connectionHandlers.push(handler)
    })
  }
}
