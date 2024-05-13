import { gen } from '@/functions/gen'
import { type BaseEntity, type FindManyOptions, type FindOptionsWhere, type FindOneOptions, type DeepPartial, type ObjectId, type DeleteResult, SaveOptions, InsertResult } from 'typeorm'
import { SocketClient } from './socket'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import { UpsertOptions } from 'typeorm/repository/UpsertOptions'

interface DatabaseOptions {
  table: string
}

export class Database<T extends BaseEntity> {
  private readonly eventName
  private readonly table

  constructor ({ table }: DatabaseOptions) {
    this.eventName = `database_${gen(18)}`
    this.table = table
  }

  async save (entities: DeepPartial<T>[] | DeepPartial<T>, options?: SaveOptions): Promise<T[] | T> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, type: 'save', entities, options })
      SocketClient.client.once(this.eventName, (data: T[] | T) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(data) })
    })
  }

  async find (options: FindManyOptions<T> | undefined): Promise<T[]> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, type: 'find', options })
      SocketClient.client.once(this.eventName, (data: T[]) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(data) })
    })
  }

  async findBy (where: FindOptionsWhere<T>): Promise<T[]> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, type: 'findBy', where })
      SocketClient.client.once(this.eventName, (data: T[]) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(data) })
    })
  }

  async findOne (options: FindOneOptions<T>): Promise<T | null> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, type: 'findOne', options })
      SocketClient.client.once(this.eventName, (data: T | null) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(data) })
    })
  }

  async upsert (entityOrEntities: QueryDeepPartialEntity<T> | QueryDeepPartialEntity<T>[], conflictPathsOrOptions: string[] | UpsertOptions<T>): Promise<InsertResult> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, type: 'upsert', entityOrEntities, conflictPathsOrOptions })
      SocketClient.client.once(this.eventName, (data: InsertResult) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(data) })
    })
  }

  async create (entity: DeepPartial<T>): Promise<T> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, type: 'create', entity })
      SocketClient.client.once(this.eventName, (data: T) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(data) })
    })
  }

  async update (criteria: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<T>, partialEntity: QueryDeepPartialEntity<T>) {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, type: 'update', criteria , partialEntity })
      SocketClient.client.once(this.eventName, (data: DeleteResult) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(data) })
    })
  }

  async delete (criteria: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<T>): Promise<DeleteResult> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, type: 'delete', criteria })
      SocketClient.client.once(this.eventName, (data: DeleteResult) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(data) })
    })
  }

  async count (options?: FindManyOptions<T>): Promise<number> {
    return await new Promise((resolve, reject) => {
      SocketClient.client.emit(this.eventName, { table: this.table, type: 'count', options })
      SocketClient.client.once(this.eventName, (data: number) => { resolve(data) })
      SocketClient.client.once(`${this.eventName}_error`, (data: any) => { reject(data) })
    })
  }
}
