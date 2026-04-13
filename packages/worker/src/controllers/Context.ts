import { Command, Component, Config, Crons, Event } from 'discord'
import type { CommandData, ComponentData, ConfigOptions, CronsConfigurations, EventData } from 'discord'
import type { PluginContext, PluginDatabase, PluginMetadata } from 'discord'
import type { ClientEvents } from 'discord.js'
import type { EntityClass, PluginRegistration } from '../types/manager.js'

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
  metadata: PluginMetadata,
  database: PluginDatabase
): { ctx: PluginContext; registration: PluginRegistration } {
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
    database,

    command<D extends boolean>(data: CommandData<D>) {
      Command.all.set(data.name, { ...data, pluginId })
      registration.commandNames.push(data.name)
    },

    event<K extends keyof ClientEvents>(data: EventData<K>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = data.run.bind(data) as (...args: any[]) => unknown
      Event.all.push({ ...data, pluginId } as EventData<keyof ClientEvents>)
      registration.eventHandlers.push({
        name: data.name as string,
        handler,
        once: data.once ?? false,
      })
    },

    component(data: ComponentData) {
      const namespacedId = `${metadata.name}_${data.customId}`
      Component.all.push({ ...data, customId: namespacedId, pluginId })
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
      registration.entities.push(entity)
    },
  }

  return { ctx, registration }
}
