import { client, root } from '@/index.js'
import { storage, type DataCrypted } from '@/storage'
import { log, section, spinner } from '@/ui.js'
import { AxiosError } from 'axios'
import boxen from 'boxen'
import chalk from 'chalk'
import { CronJob } from 'cron'
import { rm } from 'fs/promises'
import prompts, { type PromptObject } from 'prompts'
import { isSuccessResponse } from 'rpc'
import type { Bot } from 'server/src/database/entity/Bot'
import type { User } from 'server/src/database/entity/User'

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
  public static user: User
  public static bot: Bot
  private email?: string
  private password?: string
    
  async askCredentials (question?: (keyof DataCrypted)[]): Promise<DataCrypted> {
    const filteredQuestions = questions.filter((propmt) => question === undefined || question?.includes(propmt.name as keyof DataCrypted))
    const response = await prompts(filteredQuestions) as DataCrypted
    
    if (Object.keys(response).length !== filteredQuestions.length || Object.entries(response).filter(([, content]) => content === '').length > 0) {
      throw new Error(i18('error.no_reply'))
    }

    await storage.append('.data', response, { isJson: true })
    return response
  }

  async timeout () {
    if (lastTry !== undefined && (new Date().getTime() - new Date(lastTry ?? 0).getTime()) < 10 * 1000) {
      const spin = spinner(i18('error.timeout', { time: 10 })).start()
      await new Promise<void>((resolve) => setTimeout(() => { spin.stop(); resolve() }, 10 * 1000))
    }
    lastTry = new Date()
  }

  async checker (): Promise<void> {
    const data = await storage.load('.data', { isJson: true })
    this.email = data?.email
    this.password = data?.password

    if (this.email === undefined || this.password === undefined) {
      await this.askCredentials()
      return await this.checker()
    }

    await this.login().then(() => setTimeout(() => this.validator(), 10000))
  }

  async login(): Promise<User> {
    await this.timeout()
    section('Authentication')
    const spin = spinner('Signing in...').start()
    try {
      const response = await client.query('/auth/login', 'post', {
        email: this.email as string,
        password: this.password as string
      })
      if (!isSuccessResponse(response)) throw response

      spin.succeed('Signed in')
      client.setAccessToken(response.data.accessToken.token)
      await storage.append('.data', {
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      }, { isJson: true })

      const profile = await client.query('/users/profile', 'get', undefined)
      if (!isSuccessResponse(profile)) throw profile

      Auth.user = profile.data

      console.log(
        boxen(
          chalk.bold(`Hello, ${profile.data.name}`) + '\n' + chalk.dim('Authenticated successfully'),
          { padding: { top: 0, bottom: 0, left: 2, right: 2 }, borderStyle: 'round', borderColor: 'green' }
        )
      )
      console.log()

      lastTry = undefined
      await this.validator()
      return profile.data
    } catch (err) {
      spin.fail(i18('error.unstable', { element: 'API' }))
      log.error(String(err instanceof Error ? err.message : err))

      const options = [
        `(1) ${i18('authenticate.logout')}`,
        `(2) ${i18('authenticate.try_again')}`
      ].join('\n')

      const conclusion = await prompts({
        type: 'text',
        name: 'error',
        message: i18('error.login', {
          error: err instanceof AxiosError
            ? err.message
            : err instanceof Error
              ? err.message
              : '' }) + `:\n  ${i18('authenticate.choose_option')}:\n${options}\n`,
        validate: (value: string) => ['1', '2'].includes(value.trim()) ? true : i18('error.incorrect_value', { value })
      })

      switch (conclusion.error.trim()) {
      case '1': {
        await this.logout()
        await this.askCredentials()
        return await this.login()
      }
      case '2': {
        return await this.login()
      }
      default: throw new Error(i18('error.no_reply'))
      }
    }
  }

  async logout () {
    await rm(`${root}/.key`)
    await this.askCredentials()
    await this.login()
    await this.validator()
  }

  async defineBot () {
    try {
      const bots = await client.query('/bots?pageSize=999' as '/bots', 'get', undefined)
      if (!isSuccessResponse(bots)) throw bots
    
      const botList = bots.data.map((bot, index) => `${index + 1}. ${bot.name}`).join('\n')

      const result = await prompts({
        type: 'text',
        name: 'bot',
        message: `${i18('authenticate.select_bot')}:\n${botList}\n`,
        validate: (value: string) => {
          const index = parseInt(value) - 1
          return !isNaN(index) && index >= 0 && index < bots.data.length ? true : i18('error.incorrect_value', { value })
        }
      })

      const selectedIndex = parseInt(result.bot) - 1
      const selectedBot = bots.data[selectedIndex]

      await storage.append('.data', { botId: selectedBot.id }, { isJson: true })
      lastTry = undefined
      return await this.validator()
    } catch (err) {
      log.error('Failed to fetch bot list')
      log.muted(String(err instanceof Error ? err.message : err))
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

    const data = await storage.load('.data', { isJson: true })
    const id = data?.botId
    if (!id) {
      await this.defineBot()
      return
    }
    
    try {
      const bot = await client.query('/bots/:id', 'get', { id: id as number }, undefined)
      if (!isSuccessResponse(bot)) throw bot

      attempts = attempts + 1

      if (!bot.data.enabled) log.warn(i18('error.disabled', { element: 'Bot' }))
      if (Auth.bot === undefined) this.cron()

      Auth.bot = bot.data
    } catch (err) {
      log.error(`Bot record not found for ${(Auth.user as User).name}`)
      const options = [
        `(1) ${i18('authenticate.change_token')}`,
        `(2) ${i18('authenticate.try_again')}`,
        `(3) ${i18('authenticate.logout')}`
      ].join('\n')

      const conclusion = await prompts({
        name: 'Error',
        type: 'text',
        message: `${i18('error.an_error_occurred', { element: err instanceof AxiosError ? err.cause : '' })}\n${options}\n`,
        validate: (value: string) => ['1', '2', '3'].includes(value.trim()) ? true : i18('error.incorrect_value', { value: value })
      })

      switch (conclusion.Error.trim()) {
      case '1': {
        await this.defineBot()
        break
      }
      case '2': {
        await this.validator()
        break
      }
      case '3': {
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