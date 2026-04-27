export type CacheEntry = {
  buffer: Buffer
  mime: string
  size: number
  lastAccessed: number
  accessCount: number
}

export type CacheProps = {
  /**
   * Maximum size that can be cached, must be a value in bytes
   *
   * @default 2 * 1024 * 1024 * 1024 // 2GB
   */
  maxSize: number
  /**
   * Maximum time the file will remain in cache, the value must be in ms
   *
   * @default 30 * 60 * 1000 // 30 minutes
   */
  maxAge: number
}
