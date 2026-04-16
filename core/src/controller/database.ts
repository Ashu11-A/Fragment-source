/* eslint-disable @typescript-eslint/no-explicit-any */
import { root } from '@/index.js'
import { log, spinner } from '@/ui.js'
import { join } from 'path'
import { DataSource, getMetadataArgsStorage } from 'typeorm'

/**
 * Core's TypeORM DataSource wrapper.
 *
 * Plugins register their entity classes via registerPluginEntities() and the
 * DataSource is re-initialised so those entities become active. Plugins then
 * use entity static methods (find, save, etc.) directly — no query proxy needed.
 */
export class Database {
  public client: DataSource

  /** TypeORM entity classes registered by each plugin (keyed by pluginId) */
  private pluginEntities = new Map<string, any[]>()

  constructor() {
    this.client = this.buildDataSource([])
  }

  private buildDataSource(entities: any[]): DataSource {
    return new DataSource({
      type: 'sqljs' as const,
      autoSave: true,
      useLocalForage: true,
      synchronize: true,
      logging: false,
      location: join(root, '/database.wm'),
      entities: entities.length > 0
        ? entities
        : [join(root, 'entries/**/*.{ts,js}')],
      migrations: [],
    })
  }

  async init(): Promise<void> {
    if (this.client.isInitialized) await this.client.destroy()

    const allEntities = [...new Set([...this.pluginEntities.values()].flat())]
    this.client = this.buildDataSource(allEntities)

    const spin = spinner(`Database  (${allEntities.length} entities)`).start()
    await this.client.initialize()
    spin.succeed(i18('database.initialized', { length: String(allEntities.length) }))
  }

  /**
   * Register TypeORM entity classes from a plugin.
   * Triggers a DataSource re-initialisation so the entities become active.
   */
  async registerPluginEntities(pluginId: string, pluginName: string, entities: any[]): Promise<void> {
    if (entities.length === 0) return

    this.pluginEntities.set(pluginId, entities)

    const storage = getMetadataArgsStorage()
    const tableNames = entities.map((entity) => {
      const meta = storage.tables.find((t) => t.target === entity)
      return meta?.name ?? (entity as { name: string }).name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
    })

    log.info(`Registering ${entities.length} ${entities.length === 1 ? 'entity' : 'entities'} for plugin "${pluginName}": ${tableNames.join(', ')}`)
    await this.init()
  }

  /**
   * Remove all entities registered by a plugin (called on hot-reload / unload).
   */
  async unregisterPlugin(pluginId: string, pluginName: string): Promise<void> {
    if (!this.pluginEntities.has(pluginId)) return

    this.pluginEntities.delete(pluginId)
    log.info(`Unregistered entities for plugin "${pluginName}"`)
    await this.init()
  }
}

/** Singleton instance shared across core */
export const database = new Database()
