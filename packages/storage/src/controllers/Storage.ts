/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BaseStorage } from '@/plugins/storages/Base.js'
import type { Crypt } from '@/controllers/Crypt.js'
import type { StorageParams } from '@/types/storage.js'

export type { StorageParams } from '@/types/storage.js'

export class Storage<
  FileMap extends Record<string, any> = Record<string, any>
>{
  driver: BaseStorage<FileMap>
  crypt?: Crypt
  
  constructor ({ driver, crypt }: StorageParams) {
    this.driver = driver
    this.crypt = crypt
    this.driver.crypt = this.crypt
  }
}