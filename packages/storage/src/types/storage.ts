import type { LRUCache } from '@/plugins/caches/LRU.js'
import type { BaseStorage } from '@/plugins/storages/Base.js'
import type { Crypt } from '@/controllers/Crypt.js'

export type StorageParams = {
  driver: BaseStorage
  crypt?: Crypt
}

export type LocalStorageParams = {
  storagePath: string
  cache?: LRUCache
}
