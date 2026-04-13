import { Command, Component, Config, Crons, Event } from 'discord'
import type { PluginDatabase } from 'discord'
import { i18 } from '..'
import { Manager } from './Manager'
import { createPluginContext } from './Context'
import { Watcher } from './Watcher'
import type { PluginRegistration } from '../types/manager.js'

type PluginEntry = {
  manager: Manager
  registration: PluginRegistration
  fileURL: string
  pluginId: string
}

type PluginCallbacks = {
  /** Invoked after setup() completes — use to attach Discord events and register entities */
  onPluginLoaded?: (pluginId: string, registration: PluginRegistration) => Promise<void>
  /** Invoked before a plugin is unloaded — use to detach Discord events */
  onPluginUnloaded?: (pluginId: string, registration: PluginRegistration) => Promise<void>
  /** Core's database instance, forwarded to each plugin via PluginContext */
  database?: PluginDatabase
}

let nextPluginId = 0

export class Plugin {
  /** All currently loaded plugins keyed by their unique pluginId */
  static readonly all = new Map<string, PluginEntry>()

  constructor(private readonly callbacks: PluginCallbacks = {}) {}

  /** Start watching the `./plugins` directory for new / changed files */
  public watcher(): void {
    const onChange = async (filePath: string) => {
      console.log(i18('plugins.new'))
      await this.register(filePath)
    }

    console.log(i18('watcher.starting'))
    new Watcher({ onChange })
  }

  /**
   * Load (or hot-reload) a plugin from `filePath`.
   *
   * Flow:
   * 1. Unload the previous version if this path was already registered.
   * 2. Dynamic-import the plugin module (cache-busted for hot-reload).
   * 3. Validate exports and semver compatibility.
   * 4. Run plugin.setup(ctx) — populates commands, events, entities, etc.
   * 5. Invoke onPluginLoaded so core can attach events and reinitialise the DB.
   */
  async register(filePath: string): Promise<string | undefined> {
    const existing = [...Plugin.all.values()].find((e) => e.fileURL === filePath)
    if (existing) {
      console.log(i18('plugins.hasLoaded'))
      await this.unload(existing.pluginId)
    }

    const pluginId = `plugin_${nextPluginId++}`
    console.log(i18('plugins.enabling', { filePath }), '\n')

    const manager = new Manager({ fileURL: filePath })

    try {
      await manager.start()

      const { ctx, registration } = createPluginContext(
        pluginId,
        manager.metadata,
        this.callbacks.database ?? this.makeNoopDatabase()
      )

      await manager.module.setup(ctx)

      Plugin.all.set(pluginId, { manager, registration, fileURL: filePath, pluginId })

      console.log()
      console.log(i18('plugins.starting', { name: manager.metadata.name }))
      console.log('  ', i18('plugins.commands', { length: registration.commandNames.length }))
      console.log('  ', i18('plugins.components', { length: registration.componentIds.length }))
      console.log('  ', i18('plugins.events', { length: registration.eventHandlers.length }))
      console.log('  ', i18('plugins.configs', { length: registration.configNames.length }))
      console.log('  ', i18('plugins.crons', { length: registration.cronUuids.length }))
      console.log()
      console.log(i18('plugins.enabled', { filePath }))

      if (this.callbacks.onPluginLoaded) {
        await this.callbacks.onPluginLoaded(pluginId, registration)
      }

      return pluginId
    } catch (error) {
      console.error(i18('plugins.notEnabled', { filePath }), '\n', error)
      return undefined
    }
  }

  /**
   * Unload a plugin by its pluginId.
   *
   * Removes all registered commands, events, components, configs and crons
   * from the shared registries. Core's onPluginUnloaded callback is called first
   * so Discord.client event listeners can be detached cleanly.
   */
  async unload(pluginId: string): Promise<void> {
    const entry = Plugin.all.get(pluginId)
    if (!entry) return

    if (this.callbacks.onPluginUnloaded) {
      await this.callbacks.onPluginUnloaded(pluginId, entry.registration)
    }

    const { registration } = entry

    for (const name of registration.commandNames) {
      Command.all.delete(name)
    }

    Event.all = Event.all.filter((e) => e.pluginId !== pluginId)

    Component.all = Component.all.filter((c) => c.pluginId !== pluginId)

    Config.all = Config.all.filter((c) => c.pluginId !== pluginId)

    for (const uuid of registration.cronUuids) {
      const timeout = Crons.timeouts.get(uuid)
      if (timeout) clearTimeout(timeout)
      Crons.timeouts.delete(uuid)
      const idx = Crons.all.findIndex((c) => c.uuid === uuid)
      if (idx !== -1) Crons.all.splice(idx, 1)
    }

    Plugin.all.delete(pluginId)

    console.log()
    console.info(i18('plugins.disconnect', { name: entry.manager.metadata.name ?? pluginId }))
    console.log()
  }

  /** Fallback when no database is provided to the Plugin constructor */
  private makeNoopDatabase(): PluginDatabase {
    return {
      async query() {
        console.warn('[Plugin] No database configured — query ignored.')
        return undefined
      },
    }
  }
}
