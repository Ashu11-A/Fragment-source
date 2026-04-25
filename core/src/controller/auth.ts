import { trpc, root, setAccessToken } from '@/index.js'
import { runDiscordOAuthLoopback } from '@/discordOAuthLoopback.js'
import { setServerSocketBotId } from '../socket.js'
import { storage, type DataCrypted } from '@/storage'
import { log, section, spinner } from '@/ui.js'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from 'server'
import boxen from 'boxen'
import chalk from 'chalk'
import { CronJob } from 'cron'
import { rm } from 'fs/promises'
import prompts, { type PromptObject } from 'prompts'
import type { Bot } from 'server/src/database/entity/Bot'

type FragmentPlatformUser = inferRouterOutputs<AppRouter>['users']['profile']['data']

let attempts = 0
let lastTry: Date | undefined

const botTokenQuestion: PromptObject<string>[] = [
  {
    name: 'token',
    message: 'Token Discord (https://discord.com/developers/applications)\n',
    type: 'password',
  },
]

async function mergeData (partial: Partial<DataCrypted>): Promise<void> {
  const cur = (await storage.load('.data', { isJson: true })) ?? {}
  await storage.append('.data', { ...cur, ...partial } as DataCrypted, { isJson: true })
}

export class Auth {
  public static user: FragmentPlatformUser | undefined
  public static bot: Bot | undefined

  async askBotToken (): Promise<void> {
    const response = await prompts(botTokenQuestion) as { token?: string }
    if (!response.token?.trim()) throw new Error(i18('error.no_reply'))
    await mergeData({ token: response.token.trim() })
  }

  async timeout () {
    if (lastTry !== undefined && (new Date().getTime() - new Date(lastTry ?? 0).getTime()) < 10 * 1000) {
      const spin = spinner(i18('error.timeout', { time: 10 })).start()
      await new Promise<void>((resolve) => setTimeout(() => { spin.stop(); resolve() }, 10 * 1000))
    }
    lastTry = new Date()
  }

  /** Garante sessão Fragment (OAuth Discord) e token do bot em `.data`. */
  async checker (): Promise<void> {
    await this.ensurePlatformSession()
    const data = await storage.load('.data', { isJson: true })
    if (!data?.token?.trim()) {
      await this.askBotToken()
    }
    await this.validator()
  }

  async ensurePlatformSession (): Promise<FragmentPlatformUser> {
    await this.timeout()
    section('Authentication')

    const data = await storage.load('.data', { isJson: true })
    const token = data?.accessToken?.token
    if (typeof token === 'string' && token.length > 0) {
      setAccessToken(token)
      const spin = spinner('Restoring session...').start()
      try {
        const profile = await trpc.users.profile.query()
        Auth.user = profile.data
        spin.succeed('Signed in')
        console.log(
          boxen(
            chalk.bold(`Hello, ${profile.data.name}`) + '\n' + chalk.dim('Authenticated successfully'),
            { padding: { top: 0, bottom: 0, left: 2, right: 2 }, borderStyle: 'round', borderColor: 'green' },
          ),
        )
        console.log()
        lastTry = undefined
        return profile.data
      } catch (err) {
        spin.fail('Session expired or invalid')
        log.error(String(err instanceof Error ? err.message : err))
        setAccessToken(undefined)
        const cur = (await storage.load('.data', { isJson: true })) ?? {}
        delete cur.accessToken
        delete cur.refreshToken
        await storage.append('.data', cur as DataCrypted, { isJson: true })
      }
    }

    const spin = spinner('Opening browser for Discord sign-in...').start()
    try {
      await runDiscordOAuthLoopback()
      spin.succeed('Signed in with Discord')
    } catch (err) {
      spin.fail(i18('error.unstable', { element: 'API' }))
      log.error(String(err instanceof Error ? err.message : err))

      const options = [
        `(1) ${i18('authenticate.logout')}`,
        `(2) ${i18('authenticate.try_again')}`,
      ].join('\n')

      const conclusion = await prompts({
        type: 'text',
        name: 'error',
        message:
          i18('error.login', {
            error: err instanceof Error ? err.message : '',
          }) + `:\n  ${i18('authenticate.choose_option')}:\n${options}\n`,
        validate: (value: string) => (['1', '2'].includes(value.trim()) ? true : i18('error.incorrect_value', { value: String(value) })),
      })

      switch (conclusion.error.trim()) {
      case '1': {
        await this.logout()
        return await this.ensurePlatformSession()
      }
      case '2': {
        return await this.ensurePlatformSession()
      }
      default:
        throw new Error(i18('error.no_reply'))
      }
    }

    const profile = await trpc.users.profile.query()
    Auth.user = profile.data
    console.log(
      boxen(
        chalk.bold(`Hello, ${profile.data.name}`) + '\n' + chalk.dim('Authenticated successfully'),
        { padding: { top: 0, bottom: 0, left: 2, right: 2 }, borderStyle: 'round', borderColor: 'green' },
      ),
    )
    console.log()
    lastTry = undefined
    return profile.data
  }

  /** Compat: fluxos antigos chamavam `login()`. */
  async login (): Promise<FragmentPlatformUser> {
    return await this.ensurePlatformSession()
  }

  async logout () {
    await rm(`${root}/.key`).catch(() => {})
    const cur = (await storage.load('.data', { isJson: true })) ?? {}
    delete cur.accessToken
    delete cur.refreshToken
    delete cur.email
    delete cur.password
    await storage.append('.data', cur as DataCrypted, { isJson: true })
    setAccessToken(undefined)
    Auth.user = undefined
    await this.ensurePlatformSession()
    await this.validator()
  }

  async defineBot () {
    try {
      const bots = await trpc.bots.list.query({ page: '1', pageSize: '999' })

      const botList = bots.data.map((bot, index) => `${index + 1}. ${bot.name}`).join('\n')

      const result = await prompts({
        type: 'text',
        name: 'bot',
        message: `${i18('authenticate.select_bot')}:\n${botList}\n`,
        validate: (value: string) => {
          const index = parseInt(value) - 1
          return !isNaN(index) && index >= 0 && index < bots.data.length ? true : i18('error.incorrect_value', { value: String(value) })
        },
      })

      const selectedIndex = parseInt(result.bot) - 1
      const selectedBot = bots.data[selectedIndex]

      await mergeData({ botId: selectedBot.id })
      lastTry = undefined
      return await this.validator()
    } catch (err) {
      log.error('Failed to fetch bot list')
      log.muted(String(err instanceof Error ? err.message : err))
      await this.ensurePlatformSession()
      return await this.validator()
    }
  }

  async validator () {
    await this.timeout()
    if (Auth.user === undefined) {
      await this.ensurePlatformSession()
      return
    }

    const data = await storage.load('.data', { isJson: true })
    const id = data?.botId
    if (!id) {
      await this.defineBot()
      return
    }

    try {
      const bot = await trpc.bots.get.query({ id: id as number })

      attempts = attempts + 1

      if (!bot.data.enabled) log.warn(i18('error.disabled', { element: 'Bot' }))
      if (Auth.bot === undefined) this.cron()

      Auth.bot = bot.data as unknown as Bot
      setServerSocketBotId(bot.data.id)
    } catch (err) {
      log.error(`Bot record not found for ${Auth.user?.name ?? 'user'}`)
      const options = [
        `(1) ${i18('authenticate.change_token')}`,
        `(2) ${i18('authenticate.try_again')}`,
        `(3) ${i18('authenticate.logout')}`,
      ].join('\n')

      const conclusion = await prompts({
        name: 'Error',
        type: 'text',
        message: `${i18('error.an_error_occurred', { element: err instanceof Error ? err.message : '' })}\n${options}\n`,
        validate: (value: string) => (['1', '2', '3'].includes(value.trim()) ? true : i18('error.incorrect_value', { value: value })),
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
      default:
        throw new Error(i18('error.no_reply'))
      }
    }
  }

  cron (): void {
    new CronJob('* * * * *', () => this.validator()).start()
  }
}
