import { api, RootPATH, storage } from '@/index.js'
import { AxiosError } from 'axios'
import { CronJob } from 'cron'
import { credentials, type DataCrypted } from 'crypt'
import { rm } from 'fs/promises'
import prompts, { type Choice, type PromptObject } from 'prompts'
import type { Bot, User } from './api'

const emailRegex = /^[\w-\\.]+@([\w-]+\.)+[\w-]{2,4}$/g
let attempts = 0
let lastTry: Date | undefined

const questions: PromptObject<string>[] = [
  {
    name: 'email',
    message: 'Email',
    type: 'text',
    initial: `${i18('authenticate.registered')} https://fragmentbot.com\n`,
    validate: (value: string) => !emailRegex.test(value) ? i18('error.invalid', { element: 'Email' }) : true
  },
  {
    name: 'password',
    message: `${i18('crypt.your_password')} - ${i18('authenticate.registered')} https://fragmentbot.com\n`,
    type: 'password',
    validate: (value: string) => value.length < 0 ? 'Senha muito pequena!' : true
  },
  {
    name: 'token',
    message: 'Token Discord (https://discord.com/developers/applications)\n',
    type: 'password'
  }
]
export class Auth {
  public static user?: User
  public static bot?: Bot
  private email?: string
  private password?: string
    
  async askCredentials (question?: (keyof DataCrypted)[]): Promise<DataCrypted> {
    const filteredQuestions = questions.filter((propmt) => question === undefined || question?.includes(propmt.name as keyof DataCrypted))
    const response = await prompts(filteredQuestions) as DataCrypted
    
    if (Object.keys(response).length !== filteredQuestions.length || Object.entries(response).filter(([, content]) => content === '').length > 0) {
      throw new Error(i18('error.no_reply'))
    }

    await storage.write(response)
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
    await storage.read()
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
    
    try {
      await api.login({
        email: this.email as string,
        password: this.password as string
      })
    
      const profile = await api.profile()
      if (profile instanceof Error) throw profile

      Auth.user = profile.data

      console.log()
      console.log(i18('authenticate.hello', { name: profile.data.name }))
      console.log()
  
      lastTry = undefined
      await this.validator()
      return profile.data
    } catch (err) {
      console.log(err)
      console.log(i18('error.unstable', { element: 'API' }))

      const choices: Choice[] = [
        { title: i18('authenticate.logout'), value: 'logout' },
        { title: i18('authenticate.try_again'), value: 'try_again' }
      ]

      const conclusion = await prompts({
        type: 'select',
        name: 'Error',
        message: i18('error.login', {
          error: err instanceof AxiosError
            ? err.message
            : err instanceof Error
              ? err.message
              : '' }),
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
  }

  async logout () {
    await rm(`${RootPATH}/.key`)
    await this.askCredentials()
    await this.login()
    await this.validator()
  }

  async defineBot () {
    try {
      const bots = await api.bots()

      const result = await prompts({
        type: 'select',
        name: 'bot',
        message: 'Selecione seu Bot',
        choices: bots.data.map((bot) => ({
          title: bot.name,
          value: bot.uuid
        }))
      })

      await storage.write({ botId: result.bot as string })
      lastTry = undefined
      return await this.validator()
    } catch (err) {
      console.log('Ocorreu um erro ao tentar pegar a lista de bots!', err)
      await this.login()
      return await this.validator()
    }
  }

  async validator() {
    await this.timeout()
    if (Auth.user === undefined) {
      await this.login()
      return
    }

    const uuid = credentials.get('botId')
    if (!uuid) {
      await this.defineBot()
      return
    }
    
    try {
      const response = await api.bot(uuid)

      attempts = attempts + 1

      if (!response.data.enabled) console.log(i18('error.disabled', { element: 'Bot' }))
      if (Auth.bot === undefined) this.cron()

      Auth.bot = response.data
    } catch (err) {
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
        message: i18('error.an_error_occurred', { element: err instanceof AxiosError ? err.cause : '' }),
      })

      switch (conclusion.Error) {
      case 'change': {
        await this.defineBot()
        break
      }
      case 'try_again': {
        await this.validator()
        break
      }
      case 'logout': {
        await this.logout()
        break
      }
      default: throw new Error(i18('error.no_reply'))
      }
      return
    }
  }

  cron (): void { new CronJob('* * * * *', () => this.validator()).start()}
}