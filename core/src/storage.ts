import { join } from 'path'
import type { IssuedSessionPayload } from 'server'
import { LocalStorage, Storage } from 'storage'
import { root } from '@/singletons.js'

const { driver } = new Storage<{ '.data': DataCrypted }>({
  driver: new LocalStorage({
    storagePath: join(root, '/storage'),
  }),
})

export type DataCrypted = {
  email?: string
  password?: string
  botId?: number
  token?: string
  language?: string
  accessToken?: NonNullable<IssuedSessionPayload['data']['accessToken']>
  refreshToken?: NonNullable<IssuedSessionPayload['data']['refreshToken']>
}

export const storage = driver

export async function mergeStorageData(partial: Partial<DataCrypted>): Promise<void> {
  const current = (await driver.load('.data', { isJson: true })) ?? {}
  await driver.append('.data', { ...current, ...partial } as DataCrypted, { isJson: true })
}
