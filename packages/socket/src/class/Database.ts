/* eslint-disable @typescript-eslint/no-explicit-any */
import { nanoid } from 'nanoid'
import type { BaseEntity, DeepPartial, DeleteResult, FindManyOptions, FindOneOptions, FindOptionsWhere, InsertResult, ObjectId, SaveOptions } from 'typeorm'
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js'
import type { UpsertOptions } from 'typeorm/repository/UpsertOptions.js'
import { metadata } from 'utils'
import { SocketClient } from './Client.js'

interface DatabaseOptions {
  table: string
}

export class Database<T extends BaseEntity> {
  private readonly eventName
  private readonly table

  constructor ({ table }: DatabaseOptions) {
    this.eventName = `database_${nanoid().replace('_', '')}`
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
      if (!SocketClient.client?.connected) return reject('Socket is Disconnected: save')
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: metadata().name, type: 'save', entities, options })
      SocketClient.client.on(this.eventName, (data: T[] | T) => { resolve(data) })
      SocketClient.client.on(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async find (options: FindManyOptions<T> | undefined): Promise<T[]> {
    return await new Promise((resolve, reject) => {
      if (!SocketClient.client?.connected) return reject('Socket is Disconnected: find')
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: metadata().name, type: 'find', options })
      SocketClient.client.on(this.eventName, (data: T[]) => { resolve(data) })
      SocketClient.client.on(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async findBy (where: FindOptionsWhere<T>): Promise<T[]> {
    return await new Promise((resolve, reject) => {
      if (!SocketClient.client?.connected) return reject('Socket is Disconnected: findBy')
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: metadata().name, type: 'findBy', where })
      SocketClient.client.on(this.eventName, (data: T[]) => { resolve(data) })
      SocketClient.client.on(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async findOne (options: FindOneOptions<T>): Promise<T | null> {
    return await new Promise((resolve, reject) => {
      if (!SocketClient.client?.connected) return reject('Socket is Disconnected: findOne')
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: metadata().name, type: 'findOne', options })
      SocketClient.client.on(this.eventName, (data: T | null) => { resolve(data) })
      SocketClient.client.on(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async upsert (entityOrEntities: QueryDeepPartialEntity<T> | QueryDeepPartialEntity<T>[], conflictPathsOrOptions: string[] | UpsertOptions<T>): Promise<InsertResult> {
    return await new Promise((resolve, reject) => {
      if (!SocketClient.client?.connected) return reject('Socket is Disconnected: upsert')
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: metadata().name, type: 'upsert', entityOrEntities, conflictPathsOrOptions })
      SocketClient.client.on(this.eventName, (data: InsertResult) => { resolve(data) })
      SocketClient.client.on(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async create (entity: DeepPartial<T>): Promise<T> {
    return await new Promise((resolve, reject) => {
      if (!SocketClient.client?.connected) return reject('Socket is Disconnected: create')
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: metadata().name, type: 'create', entity })
      SocketClient.client.on(this.eventName, (data: T) => { resolve(data) })
      SocketClient.client.on(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async update (criteria: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<T>, partialEntity: QueryDeepPartialEntity<T>) {
    return await new Promise((resolve, reject) => {
      if (!SocketClient.client?.connected) return reject('Socket is Disconnected: update')
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: metadata().name, type: 'update', criteria , partialEntity })
      SocketClient.client.on(this.eventName, (data: DeleteResult) => { resolve(data) })
      SocketClient.client.on(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async delete (criteria: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<T>): Promise<DeleteResult> {
    return await new Promise((resolve, reject) => {
      if (!SocketClient.client?.connected) return reject('Socket is Disconnected: delete')
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: metadata().name, type: 'delete', criteria })
      SocketClient.client.on(this.eventName, (data: DeleteResult) => { resolve(data) })
      SocketClient.client.on(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }

  async count (options?: FindManyOptions<T>): Promise<number> {
    return await new Promise((resolve, reject) => {
      if (!SocketClient.client?.connected) return reject('Socket is Disconnected: count')
      SocketClient.client.emit(this.eventName, { table: this.table, plugin: metadata().name, type: 'count', options })
      SocketClient.client.on(this.eventName, (data: number) => { resolve(data) })
      SocketClient.client.on(`${this.eventName}_error`, (data: any) => { reject(typeof data === 'object' ? JSON.stringify(data, null, 2) : data) })
    })
  }
}
