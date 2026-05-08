import type { EventSchemaMap } from '../types/index.js'
import type { TypedSocket, TypedSocketServer } from '../server.js'
import type { IoSocket } from '../types/server.js'

/**
 * Defines a configuration for a Socket.IO namespace.
 */
export interface SocketNamespaceConfig<
  StoC extends EventSchemaMap,
  CtoS extends EventSchemaMap,
> {
  /** The namespace path (e.g., '/core') */
  path: string
  /** The contract definition for this namespace */
  contract: { serverToClient: StoC; clientToServer: CtoS }
  /** Optional middleware for authentication/authorization */
  middleware?: (socket: IoSocket<any, any>, next: (err?: Error) => void) => void | Promise<void>
  /** Handler called when a new socket connects to this namespace */
  onConnection: (socket: TypedSocket<StoC, CtoS>, server: TypedSocketServer<StoC, CtoS>) => void | Promise<void>
}
