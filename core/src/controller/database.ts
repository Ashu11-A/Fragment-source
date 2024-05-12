import { glob } from 'glob'
import { join } from 'path'
import { Socket } from 'socket.io'
import { DataSource, FindOptionsWhere, ObjectId, type BaseEntity, type DataSourceOptions } from 'typeorm'
import { RootPATH } from '..'

export interface EntityImport<T extends typeof BaseEntity> { default: T }

export class Database {
  public static entries: Record<string, EntityImport<typeof BaseEntity>> = {}
  public static client: DataSource

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
    await Database.client.initialize()
    console.log(`✨ Banco de dados inicializado com ${Object.keys(Database.entries).length} entries\n`)
  }

  async events (socket: Socket, eventName: string, args: any) {
    const { type, table } = args as { type: string, table: string }
    const entry = Object.entries(Database.entries).find(([key]) => key.split('.')[0] === table)

    if (entry === undefined) return
    const [, { default: Entity }] = entry
    switch (type) {
      case 'create': socket.emit(eventName, Entity.create(args.entity)); break
      case 'update': {
        socket.emit(eventName, await Entity.update(args.criteria, args.partialEntity)); break
      }
      case 'find': socket.emit(eventName, await Entity.find(args.options)); break
      case 'save': socket.emit(eventName, await Entity.save(args.entities, args.options)); break
      case 'findBy': socket.emit(eventName, await Entity.findBy(args.where as FindOptionsWhere<typeof BaseEntity>)); break
      case 'findOne': socket.emit(eventName, await Entity.findOne(args.options)); break
      case 'delete': socket.emit(eventName, await Entity.delete(args.criteria as string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<typeof BaseEntity>)); break
      case 'count': socket.emit(eventName, await Entity.count(args.options))
    }
    return
  }
}
