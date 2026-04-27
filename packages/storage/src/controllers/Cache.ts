import type { CacheEntry } from '@/types/cache.js'

export type { CacheEntry } from '@/types/cache.js'

export abstract class Cache {
  protected totalSize: number = 0
  protected fileCount: number = 0
  protected maxSize: number = 0

  abstract get (key: string): Promise<CacheEntry | null>
  abstract add (key: string, buffer: Buffer): CacheEntry
  abstract exist (key: string): boolean

  get stats () {
    return {
      totalSize: this.totalSize,
      fileCount: this.fileCount,
      maxSize: this.maxSize,
    }
  }
}