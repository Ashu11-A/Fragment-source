import { registerDatabase } from 'database'
import { registerPluginSlashCommandInConstatic, type PluginContext, type PluginMetadata } from 'discord'
import type { ClientEvents } from 'discord.js'
import {
  Config,
  Crons,
  discordEventListeners,
  interactionComponents,
  slashCommands,
  type ConfigOptions,
  type CronsConfigurations,
  type PluginComponentData,
  type PluginDiscordEventData,
  type PluginSlashCommandData,
} from 'discord/registries'
import { getMetadataArgsStorage } from 'typeorm'
import type { EntityClass, PluginRegistration } from '../types/manager.js'

/** Mirrors TypeORM's DefaultNamingStrategy for deriving table names from class names. */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

/**
 * Patches the TypeORM metadata store so that the entity's table name is
 * automatically prefixed with the plugin name.
 *
 * Name resolution order:
 *  1. `@Entity('custom_name')` or `@Entity({ name: 'custom_name' })` → `<plugin>_custom_name`
 *  2. `@Entity()` (no name) → `<plugin>_<class_name_snake_case>`
 *
 * Safe to call multiple times — skips if the prefix is already present.
 */
function applyTablePrefix(entity: EntityClass, prefix: string): void {
  const storage = getMetadataArgsStorage()
  const tableMeta = storage.tables.find((t) => t.target === entity)
  if (!tableMeta) return
  const baseName = tableMeta.name ?? toSnakeCase((entity as { name: string }).name)
  if (baseName.startsWith(`${prefix}_`)) return
  tableMeta.name = `${prefix}_${baseName}`
}

/**
 * Creates the PluginContext object injected into every plugin's setup() call.
 *
 * All registrations are tracked in `registration` so core can:
 *  - clean up commands/events/etc. on hot-reload
 *  - attach event handlers to Discord.client after setup completes
 *  - register TypeORM entities with the DataSource
 */
export function createPluginContext(
  pluginId: string,
  metadata: PluginMetadata
): { ctx: PluginContext; registration: PluginRegistration } {
  const pluginPrefix = metadata.name.replace(/^plugin-/, '')

  const registration: PluginRegistration = {
    pluginName: metadata.name,
    commandNames: [],
    eventHandlers: [],
    componentIds: [],
    configNames: [],
    cronUuids: [],
    entities: [],
  }

  const ctx: PluginContext = {
    id: pluginId,
    metadata,

    command<D extends boolean>(data: PluginSlashCommandData<D>) {
      const merged = { ...data, pluginId }
      slashCommands.set(data.name, merged)
      registration.commandNames.push(data.name)
      registerPluginSlashCommandInConstatic(merged)
    },

    event<K extends keyof ClientEvents>(data: PluginDiscordEventData<K>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = data.run.bind(data) as (...args: any[]) => unknown
      discordEventListeners.push({ ...data, pluginId } as PluginDiscordEventData<keyof ClientEvents>)
      registration.eventHandlers.push({
        name: data.name as string,
        handler,
        once: data.once ?? false,
      })
    },

    component(data: PluginComponentData) {
      const namespacedId = `${metadata.name}_${data.customId}`
      interactionComponents.push({ ...data, customId: namespacedId, pluginId })
      registration.componentIds.push(namespacedId)
    },

    config(data: ConfigOptions) {
      Config.all.push({ ...data, pluginId })
      registration.configNames.push(data.name)
    },

    cron<M>(data: CronsConfigurations<M>) {
      new Crons(data)
      const added = Crons.all[Crons.all.length - 1]
      if (added) registration.cronUuids.push(added.uuid)
    },

    registerEntity(entity: EntityClass) {
      applyTablePrefix(entity, pluginPrefix)
      if (!registration.entities.includes(entity)) {
        registration.entities.push(entity)
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerSchema(schema: Record<string, any>) {
      for (const entity of Object.values(schema)) {
        applyTablePrefix(entity as EntityClass, pluginPrefix)
        if (!registration.entities.includes(entity as EntityClass)) {
          registration.entities.push(entity as EntityClass)
        }
      }
      registerDatabase(pluginPrefix, schema)
    },
  }

  return { ctx, registration }
}
