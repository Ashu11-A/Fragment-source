import { join } from 'path'
import { LocalStorage, Storage } from 'storage'
import type { DataCrypted } from '@/types/storage.js'
import { root } from './paths'

export type { DataCrypted } from '@/types/storage.js'

export const driver = new LocalStorage({ storagePath: join(root, '.fragment', 'storage') })
export const { driver: storage } = new Storage<{ '.data': DataCrypted }>({ driver: driver })