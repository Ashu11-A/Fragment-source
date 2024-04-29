import { core } from '@/app'
import { type BotReturn, type LoginReturn } from '@/interfaces/PaymentBot'
import axios, { AxiosError } from 'axios'
import { writeFileSync } from 'fs'
import path from 'path'
import ck from 'chalk'
import { getEncryptedSettings, getInternalSettings } from '@/functions/getSettings'
import { AES } from 'crypto-js'

export class PaymentBot {
  private readonly url
  private tokens: { accessToken: string, refreshToken: string } | null
  constructor (data: { url: string }) {
    const { url } = data
    this.url = url
    this.tokens = null
  }

  save (data?: BotReturn): void {
    const filePath = path.join(process.cwd(), '.key')
    const { token } = getInternalSettings()
    const content = JSON.stringify({
      ...getEncryptedSettings(),
      ...data,
      tokens: this?.tokens ?? getEncryptedSettings()?.tokens ?? ''
    })
    const encrypt = AES.encrypt(content, token)

    writeFileSync(filePath, encrypt.toString(), null)
  }

  async login (options: {
    email: string
    password: string
  }): Promise<LoginReturn | undefined> {
    const { email, password } = options

    return await axios.post(`${this.url}/auth/login`, { email, password })
      .then((res: { data: LoginReturn }) => {
        const { accessToken: { token: accessToken }, refreshToken: { token: refreshToken } } = res.data
        this.tokens = { accessToken, refreshToken }
        this.save()
        return res.data
      })
      .catch(() => {
        new Error('Unauthorized', { cause: 'Invalided login' })
        return undefined
      })
  }

  async validate (options: {
    uuid: string
  }): Promise<BotReturn | undefined> {
    const { uuid } = options
    const response = await axios.get(`${this.url}/bots/${uuid}`, {
      headers: {
        Authorization: `Bearer ${this.tokens?.accessToken}`
      }
    })
      .then((res: { data: BotReturn }) => {
        this.save(res.data)
        if (res.data.expired) core.warn(ck.red('Token Expirado'))
        return res.data
      })
      .catch((err) => {
        console.log(err)
        if (err instanceof AxiosError) {
          this.save({
            expired: true,
            enabled: false
          })
          core.log('❌ API está offline!')
        }
      })
    return response ?? undefined
  }
}
