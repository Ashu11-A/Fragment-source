import type { EventSchemaMap } from './index.js'
import type { TypedSocket } from '../server.js'

export interface IoServer<StoC, CtoS> {
  on(event: 'connection', listener: (socket: IoSocket<StoC, CtoS>) => void): this
  emit<K extends string & keyof StoC>(event: K, ...args: Parameters<StoC[K & keyof StoC] & ((...args: never[]) => void)>): boolean
  to(room: string): { emit<K extends string & keyof StoC>(event: K, ...args: Parameters<StoC[K & keyof StoC] & ((...args: never[]) => void)>): boolean }
}

export interface IoSocket<StoC, CtoS> {
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

export type ConnectionHandler<StoC extends EventSchemaMap, CtoS extends EventSchemaMap> = (
  socket: TypedSocket<StoC, CtoS>
) => void | Promise<void>
