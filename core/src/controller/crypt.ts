import { exists } from "@/functions/fs-extra.js";
import { isJson } from "@/functions/validate.js";
import { RootPATH } from "@/index.js";
import { DataCrypted } from "@/interfaces/crypt.js";
import * as argon2 from "argon2";
import { passwordStrength } from 'check-password-strength';
import { watch } from 'chokidar';
import { randomBytes } from 'crypto';
import CryptoJS from 'crypto-js';
import { readFile, rm, writeFile } from "fs/promises";
import prompts from "prompts";

export const credentials = new Map<string, string | object | boolean | number>()

export class Crypt {
  constructor() {}

  async checker () {
    if (!(await exists(`${RootPATH}/.key`)) && process.env?.Token === undefined) await this.create()

    for (const path of ['.key', '.hash']) {
      const wather = watch(path, { cwd: RootPATH })

      wather.on('change', async () => {
        console.log('\n⚠️ Foi detectado uma mudança em um arquivo protegido!')
        await this.validate()
      })
    }
  }

  async create () {
    const select = await prompts({
      name: 'type',
      type: 'select',
      message: 'Como deseja proteger suas informações locais?',
      initial: 0,
      choices: [
        {
          title: 'Gerar senha aleatória',
          description: 'Será usada para criptografar suas informações',
          value: 'random'
        },
        {
          title: 'Definir senha',
          description: 'Será usada para criptografar suas informações',
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
        type: "password",
        message: 'Sua senha:',
        validate: (value: string) => passwordStrength(value).id < 2 ? 'Senha muito fraca! (1 Letra maiúscula, 1 Letra Minuscula, 1 Numero, 1 Carácter especial)' : true
      })
      if (key.value === undefined) throw new Error('Defina um valor!')
      await writeFile(`${RootPATH}/.env`, `Token=${key.value}`)
      credentials.set('Token', key.value)
      await this.write({})
      break
    }
    default: throw new Error('Nenhuma opção selecionada!')
    }
  }

  getToken () {
    let token = process.env.Token

    if (token === undefined) token = credentials.get('Token') as string
    if (token === undefined) throw new Error('Token de criptografia indefinido!')

    return token
  }

  async validate () {
    const data = await readFile(`${RootPATH}/.key`, { encoding: 'utf-8' }).catch(() => '')
    const dataHash = await readFile(`${RootPATH}/.hash`, { encoding: 'utf-8' }).catch(() => '')

    const invalid = async () => {
      await this.delete()
      throw new Error('Hash invalido! deletando arquivos encriptados!')
    }

    const hash = await argon2.verify(dataHash, data).catch(async () => await invalid())
    if (!hash) await invalid()
  }

  async delete () {
    if (await exists(`${RootPATH}/.key`)) await rm(`${RootPATH}/.key`)
    if (await exists(`${RootPATH}/.hash`)) await rm(`${RootPATH}/.hash`)
    if (await exists(`${RootPATH}/.env`)) await rm(`${RootPATH}/.env`)
  }

  async read (): Promise<DataCrypted | {}> {
    const token = this.getToken()
    const existKey = await exists(`${RootPATH}/.key`)
    if (!existKey) return {}

    await this.validate()
    console.log('⚠️ Informações sensíveis sendo lidas...')
    const data = await readFile(`${RootPATH}/.key`, { encoding: 'utf-8' }).catch(() => '')
    try {
      const TripleDESCrypt =  CryptoJS.TripleDES.decrypt(data, token).toString(CryptoJS.enc.Utf8)
      const BlowfishCrypt =  CryptoJS.Blowfish.decrypt(TripleDESCrypt, token).toString(CryptoJS.enc.Utf8)
      const AESCrypt =  CryptoJS.AES.decrypt(BlowfishCrypt, token).toString(CryptoJS.enc.Utf8)

      const outputData = JSON.parse(AESCrypt) as DataCrypted


      for (const [key, value] of Object.entries(outputData) as Array<[string, string | object | boolean | number]>) {
        credentials.set(key, value)
      }

    
      return outputData
    } catch {
      await this.delete()
      throw new Error('Token invalido!')
    }
  }

  async write (value: JSON | string | {}) {
    if (!isJson(value)) throw new Error('Tentatica de salvar informações invalidas, em .key')

    const token = this.getToken()
    const data = Object.assign(await this.read(), value)

    const AESCrypt = CryptoJS.AES.encrypt(JSON.stringify(data), token).toString()
    const BlowfishCrypt = CryptoJS.Blowfish.encrypt(AESCrypt, token).toString()
    const TripleDESCrypt = CryptoJS.TripleDES.encrypt(BlowfishCrypt, token).toString()
    const hashCrypt = await argon2.hash(TripleDESCrypt)

    await writeFile(`${RootPATH}/.key`, TripleDESCrypt)
    await writeFile(`${RootPATH}/.hash`, hashCrypt)
  }
}