import { fetch } from 'bun'
import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { PathType, type ManagerOptions, type Metadata, type MetadataKeys } from '../types/manager'

const keys: MetadataKeys[] = ['author', 'description', 'license', 'name', 'version']

export class Manager {
  public worker!: Worker
  public metadata!: Metadata

  constructor(public options: ManagerOptions) {
    if (!options.cachePath) this.options.cachePath = join(process.cwd(), '/cache')
    if (!existsSync(this.options.cachePath as string)) {
      console.log('[Manager] 📂 Cache path does not exist. Creating...')
      mkdirSync(this.options.cachePath as string, { recursive: true })
    }
  }

  async start () {
    const type = this.isLinkOrPath(this.options.fileURL)
    if (type === PathType.Invalid) throw new Error(`URL is Invalid! (${this.options.fileURL})`)

    let blob: Blob
    switch (type) {
    case PathType.Path: {
      console.log(`[Manager] 📄 File path detected: ${this.options.fileURL}`)
      blob = await this.createBlobFromFilePath(this.options.fileURL)
      break
    }
    case PathType.URL: {
      const cachedFilePath = this.getCachedFilePath()

      if (existsSync(cachedFilePath)) {
        console.log(`[Manager] ✅ Using cached file: ${cachedFilePath}`)
        blob = await this.createBlobFromFilePath(cachedFilePath)
        break
      }

      console.log(`[Manager] 🌐 Downloading file: ${this.options.fileURL}`)
      blob = await this.createBlobFromURL(this.options.fileURL, cachedFilePath)
      break
    }
    }

    const blobUrl = URL.createObjectURL(blob)
    console.log('[Manager] 🔗 Created Blob URL:', blobUrl)

    const worker = new Worker(blobUrl)
    this.worker = worker
    console.log('[Manager] 🛠️ Worker created.')

    let hasResponse = false

    worker.postMessage([{ info: true }, { port: this.options.port }])
    console.log('[Manager] 📤 Sent initial message to worker.')

    worker.onmessage = (event) => {
      console.log('📩 Received message from worker:', event.data)
      const data = JSON.parse(event.data)

      switch (true) {
      case data['metadata'] !== undefined: {
        const metadata = data['metadata'] as Metadata | undefined
        if (!metadata) {
          console.log('[Manager] ❌ Metadata is undefined')
          return
        }

        const hasMissingKeys = keys.some((key) => !(key in metadata) || metadata[key] === undefined)
        if (hasMissingKeys) {
          console.error('[Manager] ❌ Metadata is missing required keys:', keys.filter((key) => !(key in metadata) || metadata[key] === undefined))
          return
        }
        
        this.metadata = metadata
        hasResponse = true
        break
      }
      }
    }

    return await new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        if (!hasResponse) {
          worker.terminate()
          reject(`[Manager] ⏱️ Worker timed out (${this.options.fileURL}). Terminating...`)
        }
        resolve('[Manager] ✨ Plugin inicializado com sucesso!')
      }, 10000)
    })
  }

  private getCachedFilePath(): string {
    const fileName = this.options.fileURL.split('/').pop() as string
    const cachePath = join(this.options.cachePath as string, fileName)
    console.log('[Manager] 📂 Resolved cache file path:', cachePath)
    return cachePath
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

  private async createBlobFromURL(url: string, cachePath: string): Promise<Blob> {
    console.log(`[Manager] 🌐 Fetching URL: ${url}`)
    const response = await fetch(url)

    if (!response.ok) {
      console.error('❌ Failed to fetch URL:', response.statusText)
      throw new Error(response.statusText)
    }

    const buffer = await response.bytes()
    const blob = await response.blob()
    console.log('[Manager] 📦 Fetched and converted response to Blob.')

    console.log(`[Manager] 💾 Saving fetched file to cache: ${cachePath}`)
    await writeFile(cachePath, buffer, { encoding: 'utf-8' })

    return blob
  }

  private async createBlobFromFilePath(filePath: string): Promise<Blob> {
    const fileBuffer = await readFile(filePath)
    console.log('[Manager] 📦 Read file and converting to Blob.')
    return new Blob([fileBuffer], { type: 'application/octet-stream' })
  }
}