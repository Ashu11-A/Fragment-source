

import type { AnySchema, DatabaseRegistry } from '@/types/index.js'

/**
 * Global typed registry of plugin database schemas.
 *
 * Each plugin that wants to expose its tables augments this interface:
 *
 * @example
 * // plugins/my-plugin/src/entity/index.ts
 * export const database = { user: User, guild: Guild } as const
 *
 * declare module 'database' {
 *   interface DatabaseRegistry {
 *     'my-plugin': typeof database
 *   }
 * }
 *
 * Then any plugin (or core) can access it with full type inference:
 *
 * @example
 * import { useDatabase } from 'database'
 * const db = useDatabase('my-plugin')
 * await db.user.find({ where: { active: true } }) // → User[]
 */

export type { DatabaseRegistry } from '@/types/index.js'

/**
 * Singleton registry stored on globalThis so it is shared across all plugin
 * bundles loaded into the same Bun process. Without this, each compiled bundle
 * would get its own Map instance and `useDatabase` calls in one bundle would
 * never see schemas registered by another bundle.
 */
const REGISTRY_GLOBAL_KEY = '__fragment_database_registry__'
if (!((globalThis as Record<string, unknown>)[REGISTRY_GLOBAL_KEY])) {
  (globalThis as Record<string, unknown>)[REGISTRY_GLOBAL_KEY] = new Map<string, AnySchema>()
}
const runtimeRegistry = (globalThis as Record<string, unknown>)[REGISTRY_GLOBAL_KEY] as Map<string, AnySchema>

/**
 * Register a plugin's entity schema in the runtime registry.
 * Called internally via `ctx.registerSchema()` — do not call directly from plugins.
 */
export function registerDatabase(pluginName: string, schema: AnySchema): void {
  runtimeRegistry.set(pluginName, schema)
}

/**
 * Remove a plugin's schema from the registry (called on load failure or unload).
 */
export function unregisterDatabase(pluginName: string): void {
  runtimeRegistry.delete(pluginName)
}

/**
 * Access any registered plugin's entity classes by plugin name.
 *
 * The return type is fully inferred from the plugin's `declare module 'database'`
 * augmentation — every table key and entity type is statically known.
 *
 * Must be called inside command/event/cron handlers (after all plugins have
 * completed their setup), never at module level.
 *
 * @example
 * const db = useDatabase('ticket')
 * const open = await db.ticket.find({ where: { closed: false } })
 */
export function useDatabase<K extends keyof DatabaseRegistry>(plugin: K): DatabaseRegistry[K] {
  const schema = runtimeRegistry.get(plugin as string)
  if (!schema) {
    const available = [...runtimeRegistry.keys()].join(', ')
    throw new Error(
      `[Database] Plugin "${String(plugin)}" is not registered. ` +
        `Registered: [${available || 'none'}]`
    )
  }
  return schema as unknown as DatabaseRegistry[K]
}
