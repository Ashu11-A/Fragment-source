import { i18 } from '@/controller/lang.js'
import { Lang } from '@/controller/lang.js'
import { exists } from '@/functions/fs-extra.js'
import { isJson } from '@/functions/validate.js'
import { RootPATH } from '@/index.js'
import { DataCrypted } from '@/interfaces/crypt.js'
import * as argon2 from 'argon2'
import { passwordStrength } from 'check-password-strength'
import { watch } from 'fs'
import { randomBytes } from 'crypto'
import CryptoJS from 'crypto-js'
import { readFile, rm, writeFile } from 'fs/promises'
import forge from 'node-forge'
import prompts from 'prompts'
import { join } from 'path'

export const credentials = new Map<string, string | object | boolean | number>()

export class Crypt {
  async checker () {
    if (!(await exists(`${RootPATH}/.key`)) && process.env?.Token === undefined) await this.create()
    if (!(await exists(`${RootPATH}/privateKey.pem`)) || !(await exists(`${RootPATH}/publicKey.pem`))) await this.genKeys()

    for (const path of ['.key', '.hash']) {
      const watcher = watch(join(RootPATH, path))

      watcher.on('change', async () => {
        console.log()
        console.log(i18('crypt.file_change'))
        await this.validate()
      })
    }
  }

  async genKeys () {
    const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(4096)

    await writeFile('privateKey.pem', forge.pki.privateKeyToPem(privateKey))
    await writeFile('publicKey.pem', forge.pki.publicKeyToPem(publicKey))
  }

  async privateKey () {
    if (!(await exists(`${RootPATH}/privateKey.pem`))) throw new Error(i18('error.not_exist', { name: 'PrivateKey' }))
    return forge.pki.privateKeyFromPem(await readFile(`${RootPATH}/privateKey.pem`, { encoding: 'utf8' }))
  }
    
  async publicKey () {
    if (!await (exists(`${RootPATH}/privateKey.pem`))) throw new Error(i18('error.not_exist', { name: 'PublicKey' }))
    return forge.pki.publicKeyFromPem(await readFile(`${RootPATH}/publicKey.pem`, { encoding: 'utf8' }))
  }

  async encript (data: string) {
    return (await this.publicKey()).encrypt(data, 'RSA-OAEP')
  }

  async decrypt (data: string) {
    return (await this.privateKey()).decrypt(data, 'RSA-OAEP')
  }

  async create () {
    const select = await prompts({
      name: 'type',
      type: 'select',
      message: i18('crypt.question'),
      initial: 0,
      choices: [
        {
          title: i18('crypt.generate_title'),
          description: i18('crypt.generate_description'),
          value: 'random'
        },
        {
          title: i18('crypt.define_title'),
          description: i18('crypt.define_description'),
          value: 'defined'
        }
      ]
    })

    switch (select.type) {
    case 'random': {
      const password = randomBytes(256).toString('hex')
      await writeFile(`${RootPATH}/.env`, `Token=${password}`)
      credentials.set('Token', password)
      await this.write({})
      break
    }
    case 'defined': {
      const key = await prompts({
        name: 'value',
        type: 'password',
        message: i18('crypt.your_password'),
        validate: (value: string) => passwordStrength(value).id < 2 ? i18('crypt.weak_password') : true
      })
      if (key.value === undefined) throw new Error(i18('error.undefined', { element: 'Password' }))
      await writeFile(`${RootPATH}/.env`, `Token=${key.value}`)
      credentials.set('Token', key.value)
      await this.write({})
      break
    }
    default: throw new Error(i18('error.not_select'))
    }
  }

  getToken () {
    let token = process.env.Token

    if (token === undefined) token = credentials.get('Token') as string
    if (token === undefined) throw new Error(i18('error.undefined', { element: 'Token' }))

    return token
  }

  async validate () {
    const data = await readFile(`${RootPATH}/.key`, { encoding: 'utf-8' }).catch(() => '')
    const dataHash = await readFile(`${RootPATH}/.hash`, { encoding: 'utf-8' }).catch(() => '')

    const invalid = async () => {
      await this.delete()
      throw new Error((i18('error.invalid', { element: 'Hash' }), i18('crypt.delete_file')))
    }

    const hash = await argon2.verify(dataHash, data).catch(async () => await invalid())
    if (!hash) await invalid()
  }

  async delete () {
    if (await exists(`${RootPATH}/.key`)) await rm(`${RootPATH}/.key`)
    if (await exists(`${RootPATH}/.hash`)) await rm(`${RootPATH}/.hash`)
    if (await exists(`${RootPATH}/.env`)) await rm(`${RootPATH}/.env`)
  }

  async read (ephemeral?: boolean): Promise<DataCrypted | undefined> {
    const token = this.getToken()
    const existKey = await exists(`${RootPATH}/.key`)
    if (!existKey) return undefined

    await this.validate()
    if (!ephemeral) console.log(i18('crypt.sensitive_information'))
    const data = await readFile(`${RootPATH}/.key`, { encoding: 'utf-8' }).catch(() => '')
    try {
      const TripleDESCrypt =  CryptoJS.TripleDES.decrypt(data, token).toString(CryptoJS.enc.Utf8)
      const BlowfishCrypt =  CryptoJS.Blowfish.decrypt(TripleDESCrypt, token).toString(CryptoJS.enc.Utf8)
      const AESCrypt =  CryptoJS.AES.decrypt(BlowfishCrypt, token).toString(CryptoJS.enc.Utf8)

      const outputData = JSON.parse(AESCrypt) as DataCrypted

      if (outputData.language !== undefined) new Lang().setLanguage(outputData.language)


      for (const [key, value] of Object.entries(outputData) as Array<[string, string | object | boolean | number]>) {
        credentials.set(key, value)
      }

    
      return outputData
    } catch {
      await this.delete()
      throw new Error(i18('error.invalid', { element: 'Token' }))
    }
  }

  async write (value: Record<string, string> | string) {
    if (!isJson(value)) throw new Error(i18('error.invalid', { element: '.key' }))

    const token = this.getToken()
    const data = Object.assign(await this.read() ?? {}, value)

    const AESCrypt = CryptoJS.AES.encrypt(JSON.stringify(data), token).toString()
    const BlowfishCrypt = CryptoJS.Blowfish.encrypt(AESCrypt, token).toString()
    const TripleDESCrypt = CryptoJS.TripleDES.encrypt(BlowfishCrypt, token).toString()
    const hashCrypt = await argon2.hash(TripleDESCrypt)

    await writeFile(`${RootPATH}/.key`, TripleDESCrypt)
    await writeFile(`${RootPATH}/.hash`, hashCrypt)
  }
}