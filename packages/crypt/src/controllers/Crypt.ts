import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import forge from 'node-forge'
import { resolve } from 'path'
import { i18 } from '..'

const ROOT_PATH = process.cwd()
const PRIVATE_KEY_PATH = resolve(ROOT_PATH, 'privateKey.pem')
const PUBLIC_KEY_PATH = resolve(ROOT_PATH, 'publicKey.pem')

type CryptProps = {
  privateKey: string | forge.pki.rsa.PrivateKey;
  publicKey: string | forge.pki.rsa.PublicKey;
};

export class Crypt {
  privateKey: forge.pki.rsa.PrivateKey
  publicKey: forge.pki.rsa.PublicKey

  constructor({ privateKey, publicKey }: CryptProps) {
    this.privateKey = typeof privateKey === 'string'
      ? forge.pki.privateKeyFromPem(privateKey)
      : privateKey
    this.publicKey = typeof publicKey === 'string' 
      ? forge.pki.publicKeyFromPem(publicKey)
      : publicKey
  }

  async encrypt(utf8Data: string): Promise<string> {
    // Convert the UTF-8 plaintext string to a binary string (sequence of bytes)
    const messageBytes = forge.util.encodeUtf8(utf8Data)
    return this.publicKey.encrypt(messageBytes, 'RSA-OAEP')
  }

  async decrypt(encryptedBinaryData: string): Promise<string> {
    // Decrypt expects a binary string (ciphertext) and returns a binary string (original message bytes)
    const decryptedBytes = this.privateKey.decrypt(encryptedBinaryData, 'RSA-OAEP')
    return forge.util.decodeUtf8(decryptedBytes)
  }

  static async getKeys() {
    if (!existsSync(PRIVATE_KEY_PATH)) throw new Error(i18('error.not_exist', { name: 'PrivateKey' }))
    const privateKey = forge.pki.privateKeyFromPem(await readFile(PRIVATE_KEY_PATH, 'utf8'))

    if (!existsSync(PUBLIC_KEY_PATH)) throw new Error(i18('error.not_exist', { name: 'PublicKey' }))
    const publicKey = forge.pki.publicKeyFromPem(await readFile(PUBLIC_KEY_PATH, 'utf8'))

    return { privateKey, publicKey }
  }

  static async genKeys() {
    const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(4096)
    return {
      privateKey: forge.pki.privateKeyToPem(privateKey),
      publicKey: forge.pki.publicKeyToPem(publicKey),
    }
  }

}