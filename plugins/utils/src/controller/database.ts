import { type BaseEntity, type FindManyOptions, type FindOptionsWhere, type FindOneOptions, type DeepPartial, type ObjectId, type DeleteResult, SaveOptions, InsertResult } from 'typeorm'
import { SocketClient } from './socket'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import { UpsertOptions } from 'typeorm/repository/UpsertOptions'
import { name } from '../../package.json'
import { nanoid } from 'nanoid'

interface DatabaseOptions {
  table: string
}

export class Database<T extends BaseEntity> {
  private readonly eventName
  private readonly table
  private readonly pluginName

  constructor ({ table }: DatabaseOptions) {
    this.eventName = `database_${nanoid().replace('_', '')}`
    this.pluginName = name
    this.table = table
  }

  async createOrUpdate(
    {
      find,
      update,
      create
    }: {
    find: {
      criteria: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<T>
    },
    update: {
      options: FindOneOptions<T>,
      partialEntity: QueryDeepPartialEntity<T>
    },
    create: {
      entity: DeepPartial<T>
    }
  }) {
    const { criteria } = find
    const { partialEntity, options } = update
    const { entity } = create
    const element = await this.findOne(options)

    if (element) {
      await this.update(criteria, partialEntity)
      return
    }
    await this.save(await this.create(entity))
  }

  async save (entities: DeepPartial<T>[] | DeepPartial<T>, options?: SaveOptions): Promise<T[] | T> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: this.pluginName, type: 'save', entities, options })
      SocketClient.client.once(this.eventName, (data: T[] | T) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async find (options: FindManyOptions<T> | undefined): Promise<T[]> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: this.pluginName, type: 'find', options })
      SocketClient.client.once(this.eventName, (data: T[]) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async findBy (where: FindOptionsWhere<T>): Promise<T[]> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: this.pluginName, type: 'findBy', where })
      SocketClient.client.once(this.eventName, (data: T[]) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async findOne (options: FindOneOptions<T>): Promise<T | null> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: this.pluginName, type: 'findOne', options })
      SocketClient.client.once(this.eventName, (data: T | null) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async upsert (entityOrEntities: QueryDeepPartialEntity<T> | QueryDeepPartialEntity<T>[], conflictPathsOrOptions: string[] | UpsertOptions<T>): Promise<InsertResult> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: this.pluginName, type: 'upsert', entityOrEntities, conflictPathsOrOptions })
      SocketClient.client.once(this.eventName, (data: InsertResult) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async create (entity: DeepPartial<T>): Promise<T> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: this.pluginName, type: 'create', entity })
      SocketClient.client.once(this.eventName, (data: T) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async update (criteria: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<T>, partialEntity: QueryDeepPartialEntity<T>) {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: this.pluginName, type: 'update', criteria , partialEntity })
      SocketClient.client.once(this.eventName, (data: DeleteResult) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async delete (criteria: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<T>): Promise<DeleteResult> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: this.pluginName, type: 'delete', criteria })
      SocketClient.client.once(this.eventName, (data: DeleteResult) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async count (options?: FindManyOptions<T>): Promise<number> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: this.pluginName, type: 'count', options })
      SocketClient.client.once(this.eventName, (data: number) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }
}
