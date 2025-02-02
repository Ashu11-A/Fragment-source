export type User = {
  name: string
  email: string
  uuid: string
}

export type AccessToken = {
  token: string
  expireIn: number
}

export type RefreshToken = {
  token: string
  expireIn: number
}

export type AuthData = {
  user: User
  accessToken: AccessToken
  refreshToken: RefreshToken
}

export type BotInfo = {
  uuid: string
  name: string
  token: string
  enabled: boolean
  expired: boolean
  expire_at: string
  created_at: string
}
