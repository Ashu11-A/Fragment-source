export type IssuedSessionPayload = {
  message: string
  data: {
    accessToken: {
      token: string
      expireDate: Date
      expireSeconds: number
    }
    refreshToken: {
      token: string
      expireDate: Date
      expireSeconds: number
    }
  }
}
