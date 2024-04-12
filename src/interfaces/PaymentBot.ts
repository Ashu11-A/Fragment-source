export interface LoginReturn {
  user: {
    email: string
    name: string
  }
  accessToken: {
    token: string
    expireIn: number
  }
  refreshToken: {
    token: string
    expireIn: number
  }
}

export interface BotReturn {
  uuid?: string
  name?: string
  enabled: boolean
  expired: boolean
  expire_at?: Date | string
  created_at?: Date | string
}
