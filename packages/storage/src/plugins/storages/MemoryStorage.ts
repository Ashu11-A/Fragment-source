/* eslint-disable @typescript-eslint/no-explicit-any */
import { Readable } from 'stream'
import { BaseStorage } from '@/plugins/storages/Base.js'

export class MemoryStorage extends BaseStorage {
  private storage = new Map<string, Map<string, Buffer>>()
  
  constructor() {
    super('memory', '1.0.0')
  }

  async save(
    key: string,
    data: Blob | ArrayBuffer | Buffer | string | object,
    options?: { folder?: string; isJson?: boolean }
  ) {
    const folder = options?.folder ?? 'root'
    if (!this.storage.has(folder)) {
      this.storage.set(folder, new Map())
    }

    let bufferToStore: Buffer

    if (options?.isJson) {
      let jsonString: string
      if (typeof data === 'object' && data !== null && !(data instanceof Blob) && !(data instanceof ArrayBuffer) && !(data instanceof Buffer)) {
        jsonString = JSON.stringify(data)
      } else if (typeof data === 'string') {
        jsonString = data
      } else {
        throw new Error('For isJson=true, data must be a JavaScript object or a JSON string.')
      }
      bufferToStore = Buffer.from(jsonString, 'utf-8')
    } else {
      if (data instanceof Blob) {
        bufferToStore = Buffer.from(await data.arrayBuffer())
      } else if (data instanceof ArrayBuffer) {
        bufferToStore = Buffer.from(data)
      } else if (Buffer.isBuffer(data)) {
        bufferToStore = data
      } else if (typeof data === 'string') {
        bufferToStore = Buffer.from(data, 'utf-8')
      }
      else {
        throw new Error('Invalid data type for non-JSON save. Must be Blob, ArrayBuffer, Buffer, or string.')
      }
    }
    this.storage.get(folder)!.set(key, bufferToStore)
  }
  async load<T = any>(
    key: string,
    options?: { isJson?: boolean, folder?: string }
  ) {
    const buffer = this.storage.get(options?.folder ?? 'root')?.get(key)
    if (!buffer) return undefined

    if (options?.isJson) {
      try {
        return JSON.parse(buffer.toString('utf-8')) as T
      } catch (e) {
        console.error(`Failed to parse stored JSON for key ${key}: ${(e as Error).message}`)
        return undefined 
      }
    }
    return buffer
  }

  async append(
    key: string,
    data: Blob | ArrayBuffer | Buffer | string | object,
    options?: { folder?: string; isJson?: boolean }
  ): Promise<void> {
    const folder = options?.folder ?? 'root'
    if (!this.storage.has(folder)) {
      this.storage.set(folder, new Map())
    }

    if (options?.isJson === true) {
      let newDataObject: object
      if (typeof data === 'string') {
        try {
          newDataObject = JSON.parse(data)
        } catch (e) {
          throw new Error(`Invalid JSON string provided for append: ${(e as Error).message}`)
        }
      } else if (typeof data === 'object' && data !== null && !(data instanceof Blob) && !(data instanceof ArrayBuffer) && !(data instanceof Buffer)) {
        newDataObject = data
      } else {
        throw new Error('For JSON append (isJson=true), data must be a JSON string or a JavaScript object.')
      }

      let existingDataObject: object = {}
      const existingBuffer = this.storage.get(folder)?.get(key)
      if (existingBuffer) {
        try {
          existingDataObject = JSON.parse(existingBuffer.toString('utf-8'))
        } catch (e) {
          console.error(`Existing data for key ${key} is not valid JSON, cannot merge: ${(e as Error).message}`)
          throw new Error(`Existing data for key ${key} is not valid JSON, cannot merge: ${(e as Error).message}`)
        }
      }
      
      const mergedDataObject = { ...existingDataObject, ...newDataObject }
      const mergedBuffer = Buffer.from(JSON.stringify(mergedDataObject), 'utf-8')
      this.storage.get(folder)!.set(key, mergedBuffer)

    } else {
      if (!(data instanceof Blob) && !(data instanceof ArrayBuffer) && !Buffer.isBuffer(data)) {
        throw new Error('For binary append, data must be Blob, ArrayBuffer, or Buffer.')
      }

      const existingBuffer = this.storage.get(folder)!.get(key) || Buffer.alloc(0)
      let bufferToAppend: Buffer

      if (data instanceof Blob) {
        bufferToAppend = Buffer.from(await data.arrayBuffer())
      } else if (data instanceof ArrayBuffer) {
        bufferToAppend = Buffer.from(data)
      } else {
        bufferToAppend = data as Buffer
      }
    
      this.storage.get(folder)!.set(key, Buffer.concat([existingBuffer, bufferToAppend]))
    }
  }

  delete(key: string, folder?: string): void {
    this.storage.get(folder ?? 'root')?.delete(key)
  }

  exist(key: string, folder?: string): boolean {
    return this.storage.get(folder ?? 'root')?.has(key) ?? false
  }

  list(folder?: string): string[] {
    return Array.from(this.storage.get(folder ?? 'root')?.keys() ?? [])
  }

  async stream(key: string, folder?: string) {
    const buffer = await this.load(key, { isJson: false, folder }) 
    if (!buffer) throw new Error(`Chave "${key}" não encontrada no folder "${folder ?? 'root'}"`)

    return Readable.from(buffer)
  }
}