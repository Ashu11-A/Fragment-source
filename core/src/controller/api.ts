import axios from 'axios'
import { API_URL } from '..'

type Params = {
  accessToken?: string
  refreshToken?: string
}

export type Token = {
  token: string
  expireDate: string
  expireSeconds: number
}

type Success<Data>= {
  message: string
  data: Data
}

type RequestError = {
  message: string
}

export type User = {
  id: number,
  uuid: string,
  name: string,
  username: string,
  email: string,
  language: string,
  role: 'administrator' | 'user',
  updatedAt: string,
  createdAt: string
}

export type Bot = {
  id: number,
  uuid: string,
  name: string,
  enabled: boolean,
  updatedAt: string,
  createdAt: string,
  subscriptions: []
  plugins: []
}

type RequestAuth = Success<{
  accessToken: Token
  refreshToken: Token
}> | RequestError

type RequestProfile = Success<User> | RequestError
type RequestBots = Success<Bot[]> | RequestError
type RequestBot = Success<Bot> | RequestError

export class API {
  constructor(public options: Params) {}

  private get request () {
    return axios.create({
      baseURL: API_URL,
      headers: {
        Authorization: this.options.accessToken ? `Bearer ${this.options.accessToken}` : undefined
      }
    })
  }

  async login ({ email, password }: { email: string, password: string }) {
    const response = await this.request.post<RequestAuth>('/auth/login', { email, password })
    const result = response.data

    if (!('data' in result)) throw new Error(result.message)
    this.options.accessToken = result.data.accessToken.token
    this.options.refreshToken = result.data.refreshToken.token
    
    return result
  }

  async refresh (refreshToken?: string) {
    if (!refreshToken && !this.options.refreshToken) throw new Error('Refresh Token was not specified!')

    const response = await axios.post<RequestAuth>(`${this.request.defaults.url}/auth/refresh`, {
      headers: {
        Authorization: `Refresh ${refreshToken ?? this.options.refreshToken}`
      }
    })
    const result = response.data

    if (!('data' in result)) throw new Error(result.message)
    
    return result
  }

  async profile () {
    const response = await this.request.get<RequestProfile>('/profile')
    const result = response.data

    if (!('data' in result)) throw new Error(result.message)
    
    return result
  }

  async bots () {
    const response = await this.request.get<RequestBots>('/bot/list')
    const result = response.data

    if (!('data' in result)) throw new Error(result.message)
    
    return result
  }

  async bot (uuid: string) {
    const response = await this.request.get<RequestBot>(`/bot/${uuid}`)
    const result = response.data

    if (!('data' in result)) throw new Error(result.message)
    
    return result
  }
}