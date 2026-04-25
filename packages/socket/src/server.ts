import type { z } from 'zod'
import type { EventSchemaMap, InferEventMap } from './types.js'

// ─── Socket.io server types (re-declared to avoid hard dep on socket.io) ─────
// These match socket.io's Server/Socket generics without importing socket.io.

/** Minimal Server interface matching socket.io's Server */
interface IoServer<StoC, CtoS> {
  on(event: 'connection', listener: (socket: IoSocket<StoC, CtoS>) => void): this
  emit<K extends string & keyof StoC>(event: K, ...args: Parameters<StoC[K & keyof StoC] & ((...args: never[]) => void)>): boolean
  to(room: string): { emit<K extends string & keyof StoC>(event: K, ...args: Parameters<StoC[K & keyof StoC] & ((...args: never[]) => void)>): boolean }
}

/** Minimal Socket interface matching socket.io's Socket */
interface IoSocket<StoC, CtoS> {
  id: string
  data: Record<string, unknown>
  on<K extends string & keyof CtoS>(event: K, listener: CtoS[K & keyof CtoS]): this
  on(event: 'disconnect', listener: (reason: string) => void): this
  emit<K extends string & keyof StoC>(event: K, ...args: Parameters<StoC[K & keyof StoC] & ((...args: never[]) => void)>): boolean
  join(room: string): void
  leave(room: string): void
  to(room: string): { emit<K extends string & keyof StoC>(event: K, ...args: Parameters<StoC[K & keyof StoC] & ((...args: never[]) => void)>): boolean }
  rooms: Set<string>
  handshake: { headers: Record<string, string | string[] | undefined>; auth: Record<string, unknown> }
}

// ─── Typed server wrapper ────────────────────────────────────────────────────

type ConnectionHandler<StoC extends EventSchemaMap, CtoS extends EventSchemaMap> = (
  socket: TypedSocket<StoC, CtoS>
) => void | Promise<void>

/**
 * A typed wrapper around an individual socket.io Socket.
 * Provides `.on()` with Zod validation and `.emit()` with full type safety.
 */
export class TypedSocket<
  StoC extends EventSchemaMap,
  CtoS extends EventSchemaMap,
> {
  constructor(
    private readonly raw: IoSocket<InferEventMap<StoC>, InferEventMap<CtoS>>,
    private readonly clientSchemas: CtoS,
  ) {}

  /** Socket ID */
  get id(): string {
    return this.raw.id
  }

  /** Arbitrary data attached to this socket */
  get data(): Record<string, unknown> {
    return this.raw.data
  }

  /** Handshake metadata */
  get handshake() {
    return this.raw.handshake
  }

  /** Current rooms */
  get rooms(): Set<string> {
    return this.raw.rooms
  }

  /**
   * Listen for a client→server event with runtime Zod validation.
   * The handler receives the parsed (validated) data.
   */
  on<K extends string & keyof CtoS>(
    event: K,
    handler: CtoS[K] extends z.ZodVoid
      ? () => void | Promise<void>
      : (data: z.infer<CtoS[K]>) => void | Promise<void>,
  ): this {
    const schema = this.clientSchemas[event]

    this.raw.on(event, ((...args: unknown[]) => {
      const raw = args[0]
      const result = schema.safeParse(raw)
      if (!result.success) {
        console.warn(`[socket] validation failed for "${String(event)}":`, result.error.format())
        return
      }
      ;(handler as (...a: unknown[]) => void)(result.data)
    }) as InferEventMap<CtoS>[K])

    return this
  }

  /** Listen for disconnect */
  onDisconnect(handler: (reason: string) => void): this {
    this.raw.on('disconnect', handler)
    return this
  }

  /**
   * Emit a server→client event with full type safety.
   */
  emit<K extends string & keyof StoC>(
    event: K,
    ...args: StoC[K] extends z.ZodVoid
      ? []
      : [data: z.infer<StoC[K]>]
  ): boolean {
    return this.raw.emit(event, ...(args as Parameters<InferEventMap<StoC>[K]>))
  }

  /** Join a room */
  join(room: string): void {
    this.raw.join(room)
  }

  /** Leave a room */
  leave(room: string): void {
    this.raw.leave(room)
  }

  /** Emit to a specific room */
  to(room: string) {
    const target = this.raw.to(room)
    return {
      emit: <K extends string & keyof StoC>(
        event: K,
        ...args: StoC[K] extends z.ZodVoid ? [] : [data: z.infer<StoC[K]>]
      ): boolean => {
        return target.emit(event, ...(args as Parameters<InferEventMap<StoC>[K]>))
      }
    }
  }
}

/**
 * Typed socket.io server wrapper.
 *
 * Usage:
 * ```ts
 * const io = new TypedSocketServer(fastify.io, contract)
 * io.onConnection((socket) => {
 *   socket.on('ping', () => { ... })          // ← fully typed
 *   socket.emit('server:status', { ... })     // ← fully typed
 * })
 * ```
 */
export class TypedSocketServer<
  StoC extends EventSchemaMap,
  CtoS extends EventSchemaMap,
> {
  constructor(
    private readonly io: IoServer<InferEventMap<StoC>, InferEventMap<CtoS>>,
    private readonly clientSchemas: CtoS,
  ) {}

  /**
   * Register a connection handler. Each new socket gets wrapped
   * in a `TypedSocket` for full type-safety.
   */
  onConnection(handler: ConnectionHandler<StoC, CtoS>): this {
    this.io.on('connection', (rawSocket) => {
      const typed = new TypedSocket<StoC, CtoS>(rawSocket, this.clientSchemas)
      void handler(typed)
    })
    return this
  }

  /**
   * Broadcast an event to ALL connected clients.
   */
  emit<K extends string & keyof StoC>(
    event: K,
    ...args: StoC[K] extends z.ZodVoid
      ? []
      : [data: z.infer<StoC[K]>]
  ): boolean {
    return this.io.emit(event, ...(args as Parameters<InferEventMap<StoC>[K]>))
  }

  /**
   * Emit to a specific room.
   */
  to(room: string) {
    const target = this.io.to(room)
    return {
      emit: <K extends string & keyof StoC>(
        event: K,
        ...args: StoC[K] extends z.ZodVoid ? [] : [data: z.infer<StoC[K]>]
      ): boolean => {
        return target.emit(event, ...(args as Parameters<InferEventMap<StoC>[K]>))
      }
    }
  }
}
