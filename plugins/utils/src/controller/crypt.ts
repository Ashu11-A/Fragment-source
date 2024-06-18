import { RootPATH } from '@/index.js'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import forge from 'node-forge'

export class Crypt {
  async privateKey () {
    if (!existsSync(`${RootPATH}/privateKey.pem`)) throw new Error('PrivateKey não existe!')
    return forge.pki.privateKeyFromPem(await readFile(`${RootPATH}/privateKey.pem`, { encoding: 'utf8' }))
  }
    
  async publicKey () {
    if (!existsSync(`${RootPATH}/privateKey.pem`)) throw new Error('PublicKey não existe!')
    return forge.pki.publicKeyFromPem(await readFile(`${RootPATH}/publicKey.pem`, { encoding: 'utf8' }))
  }
    
  async encript (data: string) {
    return (await this.publicKey()).encrypt(data, 'RSA-OAEP')
  }
    
  async decrypt (data: string) {
    return (await this.privateKey()).decrypt(data, 'RSA-OAEP')
  }
}