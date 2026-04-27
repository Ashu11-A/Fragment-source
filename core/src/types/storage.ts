export type StoredToken = {
  token: string
  expireDate: string
  expireSeconds: number
}

export type DataCrypted = {
  email?: string
  password?: string
  botId?: number
  token?: string
  language?: string
  accessToken?: StoredToken
  refreshToken?: StoredToken
}
