
import { join } from 'path'
import { DataSource, getMetadataArgsStorage } from 'typeorm'
import type { AnyConstructor, DatabaseOptions } from '@/types/index.js'

export type { DatabaseOptions } from '@/types/index.js'

export class Database {
  public client: DataSource
  private entities = new Map<string, AnyConstructor[]>()

  constructor(private readonly opts: DatabaseOptions) {
    this.client = this.buildDataSource([])
  }

  private buildDataSource(entities: AnyConstructor[]): DataSource {
    return new DataSource({
      type: 'sqljs' as const,
      autoSave: true,
      useLocalForage: true,
      synchronize: true,
      logging: false,
      location: join(this.opts.root, '.fragment', 'database.wm'),
      entities: entities.length > 0
        ? entities
        : [join(this.opts.root, 'entries/**/*.{ts,js}')],
      migrations: [],
    })
  }

  async init(): Promise<void> {
    if (this.client.isInitialized) await this.client.destroy()

    const allEntities = [...new Set([...this.entities.values()].flat())]
    this.client = this.buildDataSource(allEntities)

    const spin = this.opts.spinner?.(`Database  (${allEntities.length} entities)`)
    await this.client.initialize()
    spin?.succeed(`Database initialized (${allEntities.length} entities)`)
  }

  async register(pluginName: string, entities: AnyConstructor[]): Promise<void> {
    if (entities.length === 0) return

    this.entities.set(pluginName, entities)

    const storage = getMetadataArgsStorage()
    const tableNames = entities.map((entity) => {
      const meta = storage.tables.find((t) => t.target === entity)
      return meta?.name ?? (entity as { name: string }).name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
    })

    this.opts.log?.(`Registering ${entities.length} ${entities.length === 1 ? 'entity' : 'entities'} for plugin "${pluginName}": ${tableNames.join(', ')}`)
    await this.init()
  }

  async unregister(pluginName: string): Promise<void> {
    if (!this.entities.has(pluginName)) return

    this.entities.delete(pluginName)
    this.opts.log?.(`Unregistered entities for plugin "${pluginName}"`)
    await this.init()
  }
}
