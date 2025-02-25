import { fetch } from 'bun'
import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { Socket } from 'socket.io'
import { i18 } from '..'
import { PathType, type ManagerOptions, type Metadata, type MetadataKeys } from '../types/manager'
import { WebSocket } from './Websocket'

const keys: MetadataKeys[] = ['author', 'description', 'license', 'name', 'version']

export class Manager {
  public worker!: Worker
  public metadata!: Metadata
  public websocketId!: string
  public socket!: Socket

  constructor(public options: ManagerOptions) {
    if (!options.cachePath) this.options.cachePath = join(process.cwd(), '/cache')
    if (!existsSync(this.options.cachePath as string)) {
      console.log(i18('manager.cachePathNotExist'))
      mkdirSync(this.options.cachePath as string, { recursive: true })
    }
  }

  async start() {
    const type = this.isLinkOrPath(this.options.fileURL)
    if (type === PathType.Invalid) throw new Error(i18('manager.invalidURL', { url: this.options.fileURL }))

    let blob: Blob
    switch (type) {
    case PathType.Path: {
      console.log(i18('manager.filePathDetected', { fileURL: this.options.fileURL }))
      blob = await this.createBlobFromFilePath(this.options.fileURL)
      break
    }
    case PathType.URL: {
      const cachedFilePath = this.getCachedFilePath()

      if (existsSync(cachedFilePath)) {
        console.log(i18('manager.usingCachedFile', { cachedFilePath }))
        blob = await this.createBlobFromFilePath(cachedFilePath)
        break
      }

      console.log(i18('manager.downloadingFile', { fileURL: this.options.fileURL }))
      blob = await this.createBlobFromURL(this.options.fileURL, cachedFilePath)
      break
    }
    }

    const blobUrl = URL.createObjectURL(blob)
    console.log(i18('manager.blobUrlCreated', { blobUrl }))

    this.worker = new Worker(blobUrl)
    console.log(i18('manager.workerCreated'))

    const processed = new Promise<void>((resolve, reject) => {
      this.worker.onmessage = async (event) => {
        const data = JSON.parse(event.data)
        // console.log(i18('manager.receivedMessage', { data: JSON.stringify(data) }))
    
        if (data.metadata !== undefined) {
          const metadata = data.metadata
          const hasMissingKeys = keys.some((key) => !(key in metadata) || metadata[key] === undefined)

          if (hasMissingKeys) {
            const missingKeys = keys.filter((key) => !(key in metadata) || metadata[key] === undefined)
            console.error(i18('manager.metadataMissingKeys', { missingKeys: missingKeys.join(', ') }))
            return reject()
          }
        
          this.metadata = metadata
        }
    
        if (data.websocketId !== undefined) {
          this.websocketId = data.websocketId as string
    
          const client = WebSocket.io.sockets.sockets.get(this.websocketId)
          if (!client) {
            console.log(i18('manager.socketNotFound', { 
              nameOrId: this.metadata?.name ?? this.websocketId 
            }))
            this.worker.terminate()
            return reject()
          }

          this.socket = client
        }
      }

      setTimeout(() => {
        if (!this.metadata || !this.websocketId || !this.socket) {
          this.worker.terminate()
          reject(i18('manager.workerTimeout', { fileURL: this.options.fileURL }))
        }
        
        console.log(i18('manager.pluginInitialized'))
        resolve()
      }, 5_000)
    })

    this.worker.onmessageerror = (event) => console.log(event)
    this.worker.onerror = (event) => console.log(event)

    this.worker.postMessage([{ info: true }, { port: this.options.port }])
    console.log(i18('manager.sentInitialMessage'), '\n')

    await Promise.race([
      processed,
      new Promise((_, reject) => setTimeout(() => reject('Timeout'), 10000))
    ])
    
    return this.worker
  }

  private isLinkOrPath(input: string): PathType {
    const urlPattern = /^(https?:\/\/|ftp:\/\/|file:\/\/)[^\s]+$/i // URLs HTTP, HTTPS, FTP, FILE
    const pathPattern = /^([a-zA-Z]:\\|\.\/|\/|~\/|\.\.\/)[^\s]*$/ // Common file paths

    const isUrl = urlPattern.test(input)
    const isPath = pathPattern.test(input)

    if (isUrl) return PathType.URL
    if (isPath) return PathType.Path

    return PathType.Invalid
  }

  private getCachedFilePath(): string {
    const fileName = this.options.fileURL.split('/').pop() as string
    const cachePath = join(this.options.cachePath as string, fileName)

    console.log(i18('manager.resolvedCachePath', { cachePath }))
    return cachePath
  }

  private async createBlobFromURL(url: string, cachePath: string): Promise<Blob> {
    console.log(i18('manager.fetchingUrl', { url }))
    const response = await fetch(url)

    if (!response.ok) {
      console.error(i18('manager.fetchFailed', { statusText: response.statusText }))
      throw new Error(response.statusText)
    }

    const buffer = await response.bytes()
    const blob = await response.blob()
    
    console.log(i18('manager.fetchedBlob'))
    console.log(i18('manager.savingToCache', { cachePath }))

    await writeFile(cachePath, buffer, { encoding: 'utf-8' })

    return blob
  }

  private async createBlobFromFilePath(filePath: string): Promise<Blob> {
    const fileBuffer = await readFile(filePath)
    console.log(i18('manager.readFileBlob'))

    return new Blob([fileBuffer], { type: 'application/octet-stream' })
  }
}