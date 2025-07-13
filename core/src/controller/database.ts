/* eslint-disable @typescript-eslint/no-explicit-any */
import { root } from '@/index.js'
import { join } from 'path'
import { DataSource, ObjectId, type BaseEntity, type FindOptionsWhere } from 'typeorm'

export interface EntityImport<T extends typeof BaseEntity> { default: T }

export class Database {
  public entries: Record<string, EntityImport<typeof BaseEntity>> = {}
  public client: DataSource

  constructor () {
    this.client = new DataSource({
      type: 'sqljs' as const,
      autoSave: true,
      useLocalForage: true,
      synchronize: true,
      logging: true,
      location: join(root, '/database.wm'),
      entities: [join(root, 'entries/**/*.{ts,js}')],
      migrations: [],
    })
  }

  async init () {
    await this.client.initialize()
    console.log(i18('database.initialized', { length: Object.keys(this.entries).length }))
  }

   
  async query (args: {
    type: string,
    table: string,
    plugin: string,
    options?: any
    entities?: any
    criteria?: any
    partialEntity?: any
    entityOrEntities?: any
    conflictPathsOrOptions?: any
    where?: any
    entity?: any
  }) {
    const { type, table, plugin } = args
    const entry = Object.entries(this.entries).find(([key]) => key.split('.')[0] === `${plugin}/${table}`)

    if (entry === undefined) {
      console.log(i18('database.invalid_entity', { tableName: table }), JSON.stringify(this.entries, null, 2))
      return
    }

    const [, { default: Entity }] = entry
    switch (type) {
    case 'find': return await Entity.find(args.options)
    case 'save': return await Entity.save(args.entities, args.options)
    case 'count': return await Entity.count(args.options)
    case 'update': return await Entity.update(args.criteria, args.partialEntity)
    case 'upsert': return await Entity.upsert(args.entityOrEntities, args.conflictPathsOrOptions)
    case 'findBy': return await Entity.findBy(args.where as FindOptionsWhere<typeof BaseEntity>)
    case 'delete': return await Entity.delete(args.criteria as string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<typeof BaseEntity>)
    case 'create': return await Entity.create(args.entity)
    case 'findOne': return await Entity.findOne(args.options)
    }

    return
  }
}
