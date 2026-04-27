import type { z } from 'zod'
import type { FragmentClientToServer, FragmentServerToClient } from './events.js'
import type { TypedSocket, TypedSocketServer } from '../server.js'
import type { TypedSocketClient } from '../client.js'

export type SchemaData<T extends z.ZodTypeAny> = T extends z.ZodVoid ? void : z.infer<T>

export type FragmentTypedSocket = TypedSocket<FragmentServerToClient, FragmentClientToServer>
export type FragmentTypedServer = TypedSocketServer<FragmentServerToClient, FragmentClientToServer>
export type FragmentTypedClient = TypedSocketClient<FragmentServerToClient, FragmentClientToServer>

export type ServerRunCtx<K extends keyof FragmentClientToServer, TCtx> =
  TCtx extends void
    ? { data: SchemaData<FragmentClientToServer[K]>; socket: FragmentTypedSocket; io: FragmentTypedServer }
    : { data: SchemaData<FragmentClientToServer[K]>; socket: FragmentTypedSocket; io: FragmentTypedServer; ctx: TCtx }

export type ClientRunCtx<K extends keyof FragmentServerToClient> = {
  data: SchemaData<FragmentServerToClient[K]>
  socket: FragmentTypedClient
}

export type SocketWithOn<K extends keyof FragmentClientToServer> = {
  on: (event: string, cb: (data: SchemaData<FragmentClientToServer[K]>) => void) => void
}

export type ClientSocketWithOn<K extends keyof FragmentServerToClient> = {
  on: (event: string, cb: (data: SchemaData<FragmentServerToClient[K]>) => void) => void
}
