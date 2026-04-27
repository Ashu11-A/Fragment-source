import { join } from 'path'
import { LocalStorage, Storage } from 'storage'
import { root } from '@/singletons.js'
import type { DataCrypted } from '@/types/storage.js'

export type { DataCrypted } from '@/types/storage.js'

export const { driver: storage } = new Storage<{ '.data': DataCrypted }>({
  driver: new LocalStorage({
    storagePath: join(root, '.fragment', 'storage'),
  }),
})