import { metadata, RootPATH } from '@/index.js'
import { AccessToken, AuthData, BotInfo, User } from '@/interfaces/auth.js'
import { DataCrypted } from '@/interfaces/crypt.js'
import { CronJob } from 'cron'
import { rm } from 'fs/promises'
import prompts, { Choice, PromptObject } from 'prompts'
import { credentials, Crypt } from './crypt.js'
import { i18 } from '@/lang.js'

const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g
const crypt = new Crypt()
let attempts = 0
let lastTry: Date | undefined

const questions: PromptObject<string>[] = [
  {
    name: 'email',
    message: 'Email',
    type: 'text',
    initial: `${i18('authenticate.registered')} https://fragmentbot.com`,
    validate: (value: string) => !emailRegex.test(value) ? i18('error.invalid', { element: 'Email' }) : true
  },
  {
    name: 'password',
    message: `${i18('authenticate.registered')} https://fragmentbot.com`,
    type: 'password',
    validate: (value: string) => value.length < 0 ? 'Senha muito pequena!' : true },
  {
    name: 'uuid',
    message: 'UUID', 
    type: 'text',
    initial: `${i18('authenticate.registered')} https://fragmentbot.com`,
    validate: (value: string) => value.split('-').length < 5 ? 'UUID invalido!' : true },
  {
    name: 'token',
    message: 'Token Discord (https://discord.com/developers/applications)',
    type: 'password'
  }
]
export class Auth {
  public static user?: User
  public static bot?: BotInfo
  private email?: string
  private password?: string
  private accessToken?: AccessToken
    
  async askCredentials (question?: (keyof DataCrypted)[]): Promise<DataCrypted> {
    const filteredQuestions = questions.filter((propmt) => question === undefined || question?.includes(propmt.name as keyof DataCrypted))
    const response = await prompts(filteredQuestions) as DataCrypted
    
    if (Object.keys(response).length !== filteredQuestions.length || Object.entries(response).filter(([, content]) => content === '').length > 0) {
      throw new Error(i18('error.no_reply'))
    }

    await crypt.write(response)
    return response
  }

  async timeout () {
    if (lastTry !== undefined && (new Date().getTime() - new Date(lastTry ?? 0).getTime()) < 10 * 1000) {
      console.log(i18('error.timeout', { time: 10 }))
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 10 * 1000))
    }
    lastTry = new Date()
  }

  async checker (): Promise<void> {
    await new Crypt().read()
    this.email = credentials.get('email') as string | undefined
    this.password = credentials.get('password') as string | undefined

    if (this.email === undefined || this.password === undefined) {
      await this.askCredentials()
      return await this.checker()
    }
    await this.login().then(() => setTimeout(() => this.validator(), 10000))
  }

  async login(): Promise<User> {
    await this.timeout()
    const { api } = await metadata()

    const response = await fetch(`${api}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: this.email, password: this.password }),
      headers: {
        "Content-Type": "application/json",
      }
    }).catch((err) => {
      console.log(i18('error.unstable', { element: 'API' }))
      return err
    })
    
    if (!response.ok) {
      const choices: Choice[] = [
        { title: i18('authenticate.logout'), value: 'logout' },
        { title: i18('authenticate.try_again'), value: 'try_again' }
      ]

      const conclusion = await prompts({
        type: 'select',
        name: 'Error',
        message: `Erro ${response?.statusText} ao tentar logar!`,
        choices,
        initial: 1
      })

      switch (conclusion.Error) {
      case 'logout': {
        await this.logout()
        await this.askCredentials()
        return await this.login()
      }
      case 'try_again': {
        return await this.login()
      }
      default: throw new Error(i18('error.no_reply'))
      }
    }
    const data = await response.json() as AuthData

    Auth.user = data.user
    this.accessToken = data.accessToken
    console.log()
    console.log(i18('authenticate.hello', { name: data.user.name }))
    console.log()
    return data.user
  }

  async logout () {
    await rm(`${RootPATH}/.key`)
  }

  async validator() {
    await this.timeout()
    const { api } = await metadata()
    if (
      this.accessToken === undefined ||
      Auth.user === undefined
    ) {
      await this.login()
      return
    }
    const uuid = credentials.get('uuid')
        
    const response: Response = await fetch(`${api}/bots/${uuid}`, {
      headers: {
        Authorization: `Bearer ${(this.accessToken as AccessToken).token}`
      }
    }).catch((err) => {
      console.log(i18('error.unstable', { element: 'API' }))
      return err
    })

    if (!response.ok && attempts >= 4 || response.status === 404) {
      console.log(`☝️ Então ${(Auth.user as User).name}, não achei o registro do seu bot!`)
      const choices: Choice[] = [
        { title: i18('authenticate.change_token'), value: 'change' },
        { title: i18('authenticate.try_again'), value: 'try_again' },
        { title: i18('authenticate.logout'), value: 'logout' }
      ]

      const conclusion = await prompts({
        name: 'Error',
        type: 'select',
        choices,
        message: i18('error.an_error_occurred', { element: response.statusText }),
        initial: 1
      })

      switch (conclusion.Error) {
      case 'change': {
        await this.askCredentials(['uuid'])
        await this.login()
        await this.validator()
        break
      }
      case 'try_again': {
        await this.validator()
        break
      }
      case 'logout': {
        await this.logout()
        await this.askCredentials()
        await this.login()
        await this.validator()
        break
      }
      default: throw new Error(i18('error.no_reply'))
      }

      return
    } else {
      attempts = attempts + 1

      const data = await response.json() as BotInfo

      if (data.expired) {
        console.log(i18('error.expired', { element: 'Bot' }))
      } else if (!data.enabled) {
        console.log(i18('error.disabled', { element: 'Bot' }))
      }

      if (Auth.bot === undefined) this.cron()
      Auth.bot = data
    }
  }

  cron (): void { new CronJob('* * * * *', () => this.validator()).start()}
}