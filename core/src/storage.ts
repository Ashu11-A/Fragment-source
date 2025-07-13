import { Crypt } from 'crypt'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { Routers } from 'server'
import { LocalStorage, Storage } from 'storage'
import { exists } from 'utils'
import { root } from './index.js'

const PRIVATE_KEY_PATH = join(root, 'privateKey.pem')
const PUBLIC_KEY_PATH = join(root, 'publicKey.pem')

let privateKey
let publicKey

if (
  !(await exists(PRIVATE_KEY_PATH))
  || !(await exists(PUBLIC_KEY_PATH))
) {
  const keys = await Crypt.genKeys()

  privateKey = keys.privateKey
  publicKey = keys.publicKey

  await writeFile(PRIVATE_KEY_PATH, privateKey, 'utf-8')
  await writeFile(PUBLIC_KEY_PATH, publicKey, 'utf-8')
} else {
  privateKey = await readFile(PRIVATE_KEY_PATH, { encoding: 'utf-8' })
  publicKey = await readFile(PUBLIC_KEY_PATH, { encoding: 'utf-8' })
}

/*
const crypt = new Crypt({
  privateKey,
  publicKey,
})
  */

const { driver } = new Storage<{ '.data': DataCrypted }>({
  // crypt: crypt,
  driver: new LocalStorage({
    storagePath: join(root, '/storage')
  })
})

export type DataCrypted = {
  email: string
  password: string
  botId: number
  token: string
  language: string
  accessToken: NonNullable<Routers['/auth/login']['post']['response']['200']['data']['accessToken']>
  refreshToken: NonNullable<Routers['/auth/login']['post']['response']['200']['data']['refreshToken']>
}

export const storage = driver