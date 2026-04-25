import type { z } from 'zod'
import type { FragmentClientToServer, FragmentServerToClient } from './events.js'
import type { TypedSocket, TypedSocketServer } from './server.js'
import type { TypedSocketClient } from './client.js'

type SchemaData<T extends z.ZodTypeAny> = T extends z.ZodVoid ? void : z.infer<T>

type FragmentTypedSocket = TypedSocket<FragmentServerToClient, FragmentClientToServer>
type FragmentTypedServer = TypedSocketServer<FragmentServerToClient, FragmentClientToServer>
type FragmentTypedClient = TypedSocketClient<FragmentServerToClient, FragmentClientToServer>

// ─── Server event ─────────────────────────────────────────────────────────────
// Handles events that arrive at the server from clients (clientToServer direction).

type ServerRunCtx<K extends keyof FragmentClientToServer, TCtx> =
  TCtx extends void
    ? { data: SchemaData<FragmentClientToServer[K]>; socket: FragmentTypedSocket; io: FragmentTypedServer }
    : { data: SchemaData<FragmentClientToServer[K]>; socket: FragmentTypedSocket; io: FragmentTypedServer; ctx: TCtx }

/**
 * Defines a typed handler for a clientToServer socket event.
 *
 * Without context:
 * ```ts
 * const pingEvent = new ServerEvent({
 *   name: 'ping',
 *   onRun({ socket, io }) { ... }
 * })
 * pingEvent.register(socket, io)
 * ```
 *
 * With context (e.g. fastify):
 * ```ts
 * const healthEvent = new ServerEvent<'plugin:health', { fastify: FastifyInstance }>({
 *   name: 'plugin:health',
 *   onRun({ data, ctx: { fastify } }) { ... }
 * })
 * healthEvent.register(socket, io, { fastify })
 * ```
 */
export class ServerEvent<
  K extends string & keyof FragmentClientToServer,
  TCtx = void,
> {
  readonly name: K

  constructor(
    private readonly options: {
      name: K
      onRun(event: ServerRunCtx<K, TCtx>): void | Promise<void>
    },
  ) {
    this.name = options.name
  }

  register(
    socket: FragmentTypedSocket,
    io: FragmentTypedServer,
    ...args: TCtx extends void ? [] : [ctx: TCtx]
  ): this {
    const ctx = args[0] as TCtx
    // Cast needed: TypeScript can't resolve the conditional handler type when K is generic.
    // Data is still Zod-validated by TypedSocket's middleware before reaching this handler.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(socket as any).on(this.name, (data: SchemaData<FragmentClientToServer[K]>) => {
      const event = (ctx !== undefined
        ? { data, socket, io, ctx }
        : { data, socket, io }) as ServerRunCtx<K, TCtx>
      void this.options.onRun(event)
    })
    return this
  }
}

// ─── Client event ─────────────────────────────────────────────────────────────
// Handles events that arrive at the client from the server (serverToClient direction).

type ClientRunCtx<K extends keyof FragmentServerToClient> = {
  data: SchemaData<FragmentServerToClient[K]>
  socket: FragmentTypedClient
}

/**
 * Defines a typed handler for a serverToClient socket event.
 *
 * ```ts
 * const statusEvent = new ClientEvent({
 *   name: 'server:status',
 *   onRun({ data }) {
 *     console.log(`Server is ${data.status} with ${data.connectedClients} clients`)
 *   }
 * })
 * statusEvent.register(socket)
 * ```
 */
export class ClientEvent<K extends string & keyof FragmentServerToClient> {
  readonly name: K

  constructor(
    private readonly options: {
      name: K
      onRun(event: ClientRunCtx<K>): void | Promise<void>
    },
  ) {
    this.name = options.name
  }

  register(socket: FragmentTypedClient): this {
    // Same cast rationale as ServerEvent.register.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(socket as any).on(this.name, (data: SchemaData<FragmentServerToClient[K]>) => {
      void this.options.onRun({ data, socket })
    })
    return this
  }
}
