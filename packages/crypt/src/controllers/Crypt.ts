import { passwordStrength } from 'check-password-strength'
import { createHash, randomBytes } from 'crypto'
import CryptoJS from 'crypto-js'
import { watch } from 'fs'
import { readFile, rm, writeFile } from 'fs/promises'
import forge from 'node-forge'
import { resolve } from 'path'
import prompts from 'prompts'
import { exists, isJson } from 'utils'
import { credentials, i18, lang } from '../app.js'
import { type DataCrypted } from '../types/crypt.js'

// Caminho base do projeto
const ROOT_PATH = process.cwd()
const KEY_PATH = resolve(ROOT_PATH, '.key')
const HASH_PATH = resolve(ROOT_PATH, '.hash')
const ENV_PATH = resolve(ROOT_PATH, '.env')
const PRIVATE_KEY_PATH = resolve(ROOT_PATH, 'privateKey.pem')
const PUBLIC_KEY_PATH = resolve(ROOT_PATH, 'publicKey.pem')

export class Crypt {
  async checker() {
    if (!(await exists(KEY_PATH)) && process.env?.Token === undefined) await this.create()
    if (!(await exists(PRIVATE_KEY_PATH)) || !(await exists(PUBLIC_KEY_PATH))) await this.genKeys()

    // Configuração de watcher
    for (const path of [KEY_PATH, HASH_PATH]) {
      const watcher = watch(path)
      watcher.on('change', async () => {
        console.log(i18('crypt.file_change'))
        await this.validate()
      })
    }
  }

  async genKeys() {
    const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(4096)

    await writeFile(PRIVATE_KEY_PATH, forge.pki.privateKeyToPem(privateKey))
    await writeFile(PUBLIC_KEY_PATH, forge.pki.publicKeyToPem(publicKey))
  }

  private async privateKey() {
    if (!(await exists(PRIVATE_KEY_PATH))) throw new Error(i18('error.not_exist', { name: 'PrivateKey' }))
    return forge.pki.privateKeyFromPem(await readFile(PRIVATE_KEY_PATH, 'utf8'))
  }

  private async publicKey() {
    if (!(await exists(PUBLIC_KEY_PATH))) throw new Error(i18('error.not_exist', { name: 'PublicKey' }))
    return forge.pki.publicKeyFromPem(await readFile(PUBLIC_KEY_PATH, 'utf8'))
  }

  async encrypt(data: string) {
    return (await this.publicKey()).encrypt(data, 'RSA-OAEP')
  }

  async decrypt(data: string) {
    return (await this.privateKey()).decrypt(data, 'RSA-OAEP')
  }

  async create() {
    const select = await prompts({
      name: 'type',
      type: 'select',
      message: i18('crypt.question'),
      initial: 0,
      choices: [
        { title: i18('crypt.generate_title'), description: i18('crypt.generate_description'), value: 'random' },
        { title: i18('crypt.define_title'), description: i18('crypt.define_description'), value: 'defined' }
      ]
    })

    switch (select.type) {
    case 'random': {
      const password = randomBytes(256).toString('hex')
      await writeFile(ENV_PATH, `Token=${password}`)
      await this.write({})
      break
    }
    case 'defined': {
      const key = await prompts({
        name: 'value',
        type: 'password',
        message: i18('crypt.your_password'),
        validate: (value: string) => (passwordStrength(value).id < 2 ? i18('crypt.weak_password') : true)
      })

      if (!key.value) throw new Error(i18('error.undefined', { element: 'Password' }))
      await writeFile(ENV_PATH, `Token=${key.value}`)
      await this.write({})
      break
    }
    default:
      throw new Error(i18('error.not_select'))
    }
  }

  async getToken() {
    await import('dotenv/config')
    const token = process.env.Token || (await readFile(ENV_PATH, { encoding: 'utf-8' })).replaceAll('Token=', '')
    if (!token) throw new Error(i18('error.undefined', { element: 'Token' }))
    return token
  }

  async validate() {
    const data = await readFile(KEY_PATH, 'utf8').catch(() => '')
    const dataHash = await readFile(HASH_PATH, 'utf8').catch(() => '')

    const invalid = async () => {
      await this.delete()
      throw new Error(i18('error.invalid', { element: 'Hash' }))
    }

    const computedHash = createHash('sha256').update(data).digest('hex')
    if (computedHash !== dataHash) await invalid()
  }

  async delete() {
    for (const path of [KEY_PATH, HASH_PATH, ENV_PATH]) {
      if (await exists(path)) await rm(path)
    }
  }

  async read(ephemeral?: boolean): Promise<DataCrypted | undefined> {
    if (!(await exists(ENV_PATH))) await this.checker()
    const token = await this.getToken()
    if (!(await exists(KEY_PATH))) return undefined

    await this.validate()
    if (!ephemeral) console.log(i18('crypt.sensitive_information'))

    const data = await readFile(KEY_PATH, 'utf8').catch(() => '')

    try {
      const decrypted = CryptoJS.AES.decrypt(
        CryptoJS.Blowfish.decrypt(
          CryptoJS.TripleDES.decrypt(data, token).toString(CryptoJS.enc.Utf8),
          token
        ).toString(CryptoJS.enc.Utf8),
        token
      ).toString(CryptoJS.enc.Utf8)

      const outputData = JSON.parse(decrypted) as DataCrypted
      if (outputData.language) lang.set(outputData.language)

      for (const [key, value] of Object.entries(outputData)) {
        credentials.set(key as keyof DataCrypted, value)
      }

      return outputData
    } catch (err) {
      console.log(err)
      await this.delete()
      throw new Error(i18('error.invalid', { element: 'Token' }))
    }
  }

  async write(value: Partial<Record<keyof DataCrypted, DataCrypted[keyof DataCrypted]>>) {
    if (!isJson(value)) throw new Error(i18('error.invalid', { element: '.key' }))

    const token = await this.getToken()
    const data = { ...((await this.read(true)) ?? {}), ...value as Record<string, string> }

    const encrypted = CryptoJS.TripleDES.encrypt(
      CryptoJS.Blowfish.encrypt(
        CryptoJS.AES.encrypt(JSON.stringify(data), token).toString(),
        token
      ).toString(),
      token
    ).toString()

    const hash = createHash('sha256').update(encrypted).digest('hex')

    await writeFile(KEY_PATH, encrypted)
    await writeFile(HASH_PATH, hash)
  }
}
