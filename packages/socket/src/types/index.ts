import { z } from 'zod'

// ─── Schema helper ───────────────────────────────────────────────────────────
/**
 * Define an event with a Zod schema for its payload.
 * This gives us both runtime validation AND compile-time inference.
 */
export function defineEvent<T extends z.ZodTypeAny>(schema: T) {
  return schema
}

// ─── Utility types ───────────────────────────────────────────────────────────

/**
 * An event map is a record of event names → Zod schemas.
 * Example:
 * ```ts
 * const events = {
 *   'plugin:loaded': defineEvent(z.object({ name: z.string() })),
 *   'ping': defineEvent(z.void()),
 * } satisfies EventSchemaMap
 * ```
 */
export type EventSchemaMap = Record<string, z.ZodTypeAny>

/**
 * Infers the TypeScript types from a schema map.
 * Converts `{ 'ping': z.ZodVoid }` into `{ ping: (data: void) => void }`.
 * Used internally by socket.io's generic type parameters.
 */
export type InferEventMap<T extends EventSchemaMap> = {
  [K in keyof T]: T[K] extends z.ZodVoid
    ? () => void
    : (data: z.infer<T[K]>) => void
}

/**
 * The full contract between server and client.
 * Generic over both directions of communication.
 */
export interface SocketContract<
  StoC extends EventSchemaMap = EventSchemaMap,
  CtoS extends EventSchemaMap = EventSchemaMap,
> {
  serverToClient: StoC
  clientToServer: CtoS
}
