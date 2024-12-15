import { fetch } from 'bun'
import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { PathType, type ManagerOptions } from '../types/manager'

export class Manager {
  static workers: Worker[] = []
  cachePath: string = join(process.cwd(), '/cache')

  constructor(public options: ManagerOptions) {
    if (options.cachePath) this.cachePath = options.cachePath
  }

  async init() {
    try {
      if (!existsSync(this.cachePath)) await mkdir(this.cachePath, { recursive: true })

      const type = this.isLinkOrPath(this.options.fileURL)
      if (type === PathType.Invalid) throw new Error(`URL is Invalid! (${this.options.fileURL})`)

      let blob: Blob

      switch (type) {
      case PathType.Path: {
        blob = await this.createBlobFromFilePath(this.options.fileURL)
        break
      }
      case PathType.URL: {
        const cachedFilePath = this.getCachedFilePath()
        
        if (existsSync(cachedFilePath)) {
          console.log(`Using cached file: ${cachedFilePath}`)
          blob = await this.createBlobFromFilePath(cachedFilePath)
          break
        }
            
        console.log(`Downloading file: ${this.options.fileURL}`)
        blob = await this.createBlobFromURL(this.options.fileURL, cachedFilePath)
        break 
      }
      }
        
      const blobUrl = URL.createObjectURL(blob)
      const worker = new Worker(blobUrl)

      worker.postMessage([{ info: true }, { port: 3000 }])
      worker.onmessage = (event) => {
        const data = JSON.parse(event.data)
            
        switch (true) {
        case data['metadata'] !== undefined: {
          console.log(data.metadata)
        }
        }
      }

      Manager.workers.push(worker)
    } catch (error) {
      console.error('Erro ao inicializar o Worker:', error)
    }
  }

  private getCachedFilePath(): string {
    const fileName = this.options.fileURL.split('/').pop() as string

    return join(this.cachePath, fileName)
  }

  private isLinkOrPath(input: string): PathType  {
    const urlPattern = /^(https?:\/\/|ftp:\/\/|file:\/\/)[^\s]+$/i // URLs HTTP, HTTPS, FTP, FILE
    const pathPattern = /^([a-zA-Z]:\\|\.\/|\/|~\/|\.\.\/)[^\s]*$/ // Caminhos de arquivo comuns

    if (urlPattern.test(input)) return PathType.URL
    if (pathPattern.test(input)) return PathType.Path

    return PathType.Invalid
  }

  private async createBlobFromURL(url: string, cachePath: string): Promise<Blob> {
    const response = await fetch(url)

    if (!response.ok) throw new Error(response.statusText)
        
    const buffer = await response.bytes()
    const blob = await response.blob()
    await writeFile(cachePath, buffer, { encoding: 'utf-8' })

    return blob
  }

  private async createBlobFromFilePath(filePath: string): Promise<Blob> {
    const fileBuffer = await readFile(filePath)
    return new Blob([fileBuffer], { type: 'application/octet-stream' })
  }
}