interface ExpressConfig {
  ip: string
  Port: number
  encryptionKey: string // Enforce 32 character length
  cors: {
    active: boolean
    allow: string[]
  }
}

type Emoji = Record<string, string>

interface Auth {
  email: string
  password: string
  uuid: string
}

export interface Config {
  Express: ExpressConfig
  Emojis: Emoji
  Auth: Auth
}

interface TokenData {
  accessToken: string
  refreshToken: string
}

export interface EncryptedConfig {
  api: string
  tokens: TokenData
  expired: boolean
  enabled: boolean
  expire_at: string
  created_at: string
  uuid: string
  name: string
}

export interface InternalConfig {
  token: string
}
