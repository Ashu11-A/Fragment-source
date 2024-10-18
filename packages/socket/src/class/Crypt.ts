import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import forge from 'node-forge'
import { __plugin_dirname } from 'utils'

export class Crypt {
  constructor () {}
  async privateKey () {
    if (!existsSync(`${__plugin_dirname}/privateKey.pem`)) throw new Error('PrivateKey não existe!')
    return forge.pki.privateKeyFromPem(await readFile(`${__plugin_dirname}/privateKey.pem`, { encoding: 'utf8' }))
  }
    
  async publicKey () {
    if (!existsSync(`${__plugin_dirname}/privateKey.pem`)) throw new Error('PublicKey não existe!')
    return forge.pki.publicKeyFromPem(await readFile(`${__plugin_dirname}/publicKey.pem`, { encoding: 'utf8' }))
  }
    
  async encript (data: string) {
    return (await this.publicKey()).encrypt(data, 'RSA-OAEP')
  }
    
  async decrypt (data: string) {
    return (await this.privateKey()).decrypt(data, 'RSA-OAEP')
  }
}