import { glob } from 'glob'
import { join } from 'path'
import { Socket } from 'socket.io'
import { DataSource, FindOptionsWhere, ObjectId, type BaseEntity, type DataSourceOptions } from 'typeorm'
import { RootPATH } from '@/index.js'
import { i18 } from '@/controller/lang.js'
import { performance } from 'perf_hooks'

export interface EntityImport<T extends typeof BaseEntity> { default: T }

export class Database {
  public static entries: Record<string, EntityImport<typeof BaseEntity>> = {}
  public static client?: DataSource

  constructor () {}

  async create (options: DataSourceOptions) {
    Database.client = new DataSource({
      ...options,
      synchronize: true,
      logging: false,
      entities: await glob(`${join(RootPATH, 'entries')}/**/*.{ts,js}`),
      migrations: [],
      subscribers: []
    })
  }

  async start () {
    await Database.client?.initialize()
    console.log(i18('database.initialized', { length: Object.keys(Database.entries).length }))
    console.log()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async events (socket: Socket, eventName: string, args: any) {
    const { type, table, plugin } = args as { type: string, table: string, plugin: string }
    const entry = Object.entries(Database.entries).find(([key]) => key.split('.')[0] === `${plugin}/${table}`)

    if (entry === undefined) {
      console.log(i18('database.invalid_entity', { tableName: table }), JSON.stringify(Database.entries, null, 2))
      return
    }

    const [, { default: Entity }] = entry
    try {
      const start = performance.now()

      switch (type) {
      case 'find': socket.emit(eventName, await Entity.find(args.options)); break
      case 'save': socket.emit(eventName, await Entity.save(args.entities, args.options)); break
      case 'count': socket.emit(eventName, await Entity.count(args.options)); break
      case 'update': socket.emit(eventName, await Entity.update(args.criteria, args.partialEntity)); break
      case 'upsert': socket.emit(eventName, await Entity.upsert(args.entityOrEntities, args.conflictPathsOrOptions)); break
      case 'findBy': socket.emit(eventName, await Entity.findBy(args.where as FindOptionsWhere<typeof BaseEntity>)); break
      case 'delete': socket.emit(eventName, await Entity.delete(args.criteria as string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<typeof BaseEntity>)); break
      case 'create': socket.emit(eventName, await Entity.create(args.entity)); break
      case 'findOne': socket.emit(eventName, await Entity.findOne(args.options)); break
      }

      const end = performance.now()
      console.log(`🛎️  [${plugin}]: Database -> ${type} [${(end - start).toFixed(2)} ms]`)
    } catch (err) {
      console.log(err)
      socket.emit(`${eventName}_error`, err)
    }
    return
  }
}
