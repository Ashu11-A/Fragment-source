/* eslint-disable @typescript-eslint/no-explicit-any */
import { root } from '@/index.js'
import type { PluginDatabase } from 'discord'
import { join } from 'path'
import { DataSource, ObjectId, type BaseEntity, type FindOptionsWhere } from 'typeorm'

type QueryArgs = {
  type: string
  table: string
  plugin: string
  options?: any
  entities?: any
  criteria?: any
  partialEntity?: any
  entityOrEntities?: any
  conflictPathsOrOptions?: any
  where?: any
  entity?: any
}

/**
 * Core's TypeORM DataSource wrapper.
 *
 * Implements PluginDatabase so it can be injected into PluginContext.
 * Plugin entities are accumulated per-plugin and the DataSource is
 * re-initialised whenever entities change.
 */
export class Database implements PluginDatabase {
  public client: DataSource

  /** TypeORM entity classes registered by each plugin (keyed by pluginId) */
  private pluginEntities = new Map<string, any[]>()

  /**
   * Flat lookup: "pluginName/ClassName" → entity class.
   * Built by registerPluginEntities() and used by query() to resolve the right entity.
   */
  private entityMap = new Map<string, typeof BaseEntity>()

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

    const allEntities = [...this.pluginEntities.values()].flat()
    this.client = this.buildDataSource(allEntities)

    await this.client.initialize()
    console.log(i18('database.initialized', { length: allEntities.length }))
  }

  /**
   * Register TypeORM entity classes from a plugin.
   * `pluginName` is the plugin's metadata.name (used to namespace entity lookups).
   * Triggers a DataSource re-initialisation so the entities become active.
   */
  async registerPluginEntities(pluginId: string, pluginName: string, entities: any[]): Promise<void> {
    if (entities.length === 0) return

    // Remove stale entries for this pluginId from the entityMap before re-adding
    for (const [key] of this.entityMap) {
      if (key.startsWith(`${pluginName}/`)) this.entityMap.delete(key)
    }

    this.pluginEntities.set(pluginId, entities)
    for (const entity of entities) {
      this.entityMap.set(`${pluginName}/${entity.name}`, entity as typeof BaseEntity)
    }

    console.log(`[Database] Registering ${entities.length} entity/entities for plugin "${pluginName}"`)
    await this.init()
  }

  /**
   * Remove all entities registered by a plugin (called on hot-reload / unload).
   */
  async unregisterPlugin(pluginId: string, pluginName: string): Promise<void> {
    if (!this.pluginEntities.has(pluginId)) return

    // Clean up entityMap entries for this plugin
    for (const [key] of this.entityMap) {
      if (key.startsWith(`${pluginName}/`)) this.entityMap.delete(key)
    }

    this.pluginEntities.delete(pluginId)
    await this.init()
  }

  async query(args: QueryArgs): Promise<unknown> {
    const { type, table, plugin } = args
    const lookupKey = `${plugin}/${table}`
    const Entity = this.entityMap.get(lookupKey)

    if (!Entity) {
      const available = [...this.entityMap.keys()].join(', ')
      console.log(i18('database.invalid_entity', { tableName: table }), `Available: [${available}]`)
      return
    }

    switch (type) {
    case 'find': return await Entity.find(args.options)
    case 'save': return await Entity.save(args.entities, args.options)
    case 'count': return await Entity.count(args.options)
    case 'update': return await Entity.update(args.criteria, args.partialEntity)
    case 'upsert': return await Entity.upsert(args.entityOrEntities, args.conflictPathsOrOptions)
    case 'findBy': return await Entity.findBy(args.where as FindOptionsWhere<typeof BaseEntity>)
    case 'delete': return await Entity.delete(args.criteria as string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<typeof BaseEntity>)
    case 'create': return Entity.create(args.entity)
    case 'findOne': return await Entity.findOne(args.options)
    }

    return
  }
}

/** Singleton instance shared with all plugins via PluginContext */
export const db = new Database()
