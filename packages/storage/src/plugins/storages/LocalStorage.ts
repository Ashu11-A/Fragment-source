/* eslint-disable @typescript-eslint/no-explicit-any */
import { createReadStream, existsSync } from 'fs'
import { appendFile as fsAppendFile, mkdir, readdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { Readable } from 'stream'
import { LRUCache } from '../caches/LRU.js'
import { BaseStorage } from './Base.js'

type LocalStorageParams = {
  storagePath: string
  cache?: LRUCache
}

export class LocalStorage extends BaseStorage {
  private storagePath: string
  public readonly cache = new LRUCache()

  constructor(params: LocalStorageParams) {
    super('local', '1.0.0')
    this.storagePath = params.storagePath
    if (params.cache) this.cache = params.cache
  }

  async save(
    key: string,
    data: Blob | ArrayBuffer | Buffer | string | object,
    options?: { folder?: string; isJson?: boolean }
  ) {
    const folderPath = options?.folder ? join(this.storagePath, options.folder) : this.storagePath
    const filePath = join(folderPath, key)

    let stringToProcess: string
    let bufferForCache: Buffer

    if (options?.isJson) {
      if (typeof data === 'object' && data !== null && !(data instanceof Blob) && !(data instanceof ArrayBuffer) && !(data instanceof Buffer)) {
        stringToProcess = JSON.stringify(data)
      } else if (typeof data === 'string') {
        stringToProcess = data
      } else {
        throw new Error('For isJson=true, data must be a JavaScript object or a JSON string.')
      }
      bufferForCache = Buffer.from(stringToProcess, 'utf-8')
    } else {
      const tempBuffer = data instanceof Blob
        ? Buffer.from(await data.arrayBuffer())
        : data instanceof ArrayBuffer
          ? Buffer.from(data)
          : Buffer.isBuffer(data)
            ? data
            : typeof data === 'string'
              ? Buffer.from(data, 'utf-8') 
              : (() => { throw new Error('Invalid data type for non-JSON save. Must be Blob, ArrayBuffer, Buffer, or string.') })()
      
      bufferForCache = tempBuffer
      stringToProcess = bufferForCache.toString('utf-8')
    }

    const dataToStore = this.crypt
      ? await this.crypt.encrypt(stringToProcess)
      : bufferForCache 

    if (!existsSync(folderPath)) await mkdir(folderPath, { recursive: true })

    this.cache.add(key, bufferForCache)
    await writeFile(filePath, dataToStore, { encoding: 'utf-8' })
  }

  async load<T = any>(
    key: string,
    options?: { isJson?: boolean, folder?: string }
  ) {
    if (this.cache.exist(key)) {
      const cached = await this.cache.get(key)
      if (cached) {
        if (options?.isJson) {
          try {
            return JSON.parse(cached.buffer.toString('utf-8')) as T
          } catch (e) {
            console.error(`Failed to parse cached JSON for key ${key}. Will attempt to load from disk. Error: ${(e as Error).message}`)
          }
        } else {
          return cached.buffer
        }
      }
    }

    const filePath = join(this.storagePath, options?.folder ?? '', key)
    if (!existsSync(filePath)) return undefined
    
    if (!this.crypt && !options?.isJson) {
      const rawBuffer = await readFile(filePath)
      this.cache.add(key, rawBuffer)
      return rawBuffer
    }

    const fileContentString = await readFile(filePath, { encoding: 'utf-8' })
    
    let decryptedString: string
    if (this.crypt) {
      decryptedString = await this.crypt.decrypt(fileContentString)
    } else {
      decryptedString = fileContentString
    }

    const decryptedBuffer = Buffer.from(decryptedString, 'utf-8')
    this.cache.add(key, decryptedBuffer)

    if (options?.isJson) {
      try {
        return JSON.parse(decryptedString) as T
      } catch (e) {
        throw new Error(`Failed to parse JSON from file ${key}: ${(e as Error).message}`)
      }
    }
    
    return decryptedBuffer
  }
  
  async append(
    key: string,
    data: Blob | ArrayBuffer | Buffer | string | object,
    options?: { folder?: string; isJson?: boolean }
  ): Promise<void> {
    const folderPath = options?.folder ? join(this.storagePath, options.folder) : this.storagePath
    const filePath = join(folderPath, key)

    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true })
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

      let existingDataObject
      if (this.exist(key, options?.folder)) {
        try {
          existingDataObject = await this.load(key, { isJson: true, folder: options?.folder })
        } catch (e) {
          console.error(`File ${key} exists but could not be loaded/parsed as JSON for merging: ${(e as Error).message}`)
          throw new Error(`File ${key} exists but could not be loaded/parsed as JSON for merging: ${(e as Error).message}`)
        }
      }
      
      const mergedDataObject = { ...existingDataObject, ...newDataObject } // Shallow merge
      await this.save(key, mergedDataObject, { folder: options?.folder, isJson: true })

    } else {
      if (!(data instanceof Blob) && !(data instanceof ArrayBuffer) && !Buffer.isBuffer(data)) {
        throw new Error('For binary append, data must be Blob, ArrayBuffer, or Buffer.')
      }

      const bufferToAppend = data instanceof Blob
        ? Buffer.from(await data.arrayBuffer())
        : data instanceof ArrayBuffer
          ? Buffer.from(data)
          : data as Buffer 

      await fsAppendFile(filePath, bufferToAppend)
    }
  }

  async delete(key: string, folder?: string) {
    const filePath = join(this.storagePath, folder ?? '', key)
    if (existsSync(filePath)) await rm(filePath)
  }

  exist(key: string, folder?: string) {
    const filePath = join(this.storagePath, folder ?? '', key)

    return existsSync(filePath)
  }

  async list(folder?: string) {
    const dirPath = join(this.storagePath, folder ?? '')
    if (!existsSync(dirPath)) return []

    return await readdir(dirPath)
  }
  
  async stream(key: string, folder?: string): Promise<Readable> {
    const filePath = join(this.storagePath, folder ?? '', key)
    if (!existsSync(filePath)) throw new Error(`Arquivo ${key} não encontrado`)

    return createReadStream(filePath)
  }
}