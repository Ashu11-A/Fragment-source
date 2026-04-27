import type forge from 'node-forge'

export type DataCrypted = {
  email: string
  password: string
  botId: number
  token: string
  language: string
  accessToken: string
  refreshToken: string
}

export type CryptProps = {
  privateKey: string | forge.pki.rsa.PrivateKey
  publicKey: string | forge.pki.rsa.PublicKey
}
