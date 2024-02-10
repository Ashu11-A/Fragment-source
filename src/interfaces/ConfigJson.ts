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

export interface Config {
  Express: ExpressConfig
  Emojis: Emoji
}
