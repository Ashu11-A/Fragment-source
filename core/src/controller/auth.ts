import { trpc, root, setAccessToken } from '@/singletons.js'
import { runDiscordOAuthLoopback } from '@/discordOAuthLoopback.js'
import { mergeStorageData, storage, type DataCrypted } from '@/storage.js'
import { log, printWelcome, section, spinner } from '@/ui.js'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from 'server'
import { rm } from 'fs/promises'
import prompts, { type PromptObject } from 'prompts'
import type { Bot } from 'server/src/database/entity/Bot'
import { setServerSocketBotId } from '@/events/socket'

type FragmentPlatformUser = inferRouterOutputs<AppRouter>['users']['profile']['data']

let lastTry: Date | undefined

const botTokenQuestion: PromptObject<string>[] = [
  {
    name: 'token',
    message: 'Token Discord (https://discord.com/developers/applications)\n',
    type: 'password',
  },
]

export class Auth {
  public static user: FragmentPlatformUser | undefined
  public static bot: Bot | undefined

  async askBotToken(): Promise<void> {
    const response = await prompts(botTokenQuestion) as { token?: string }
    if (!response.token?.trim()) throw new Error(i18('error.no_reply'))
    await mergeStorageData({ token: response.token.trim() })
  }

  async timeout(): Promise<void> {
    if (lastTry !== undefined && (new Date().getTime() - new Date(lastTry).getTime()) < 10 * 1000) {
      const spin = spinner(i18('error.timeout', { time: 10 })).start()
      await new Promise<void>((resolve) => setTimeout(() => { spin.stop(); resolve() }, 10 * 1000))
    }
    lastTry = new Date()
  }

  async checker(): Promise<void> {
    await this.ensurePlatformSession()
    const data = await storage.load('.data', { isJson: true })
    if (!data?.token?.trim()) {
      await this.askBotToken()
    }
    await this.validator()
  }

  async ensurePlatformSession(): Promise<FragmentPlatformUser> {
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
        printWelcome(profile.data.name)
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
          i18('error.login', { error: err instanceof Error ? err.message : '' }) +
          `:\n  ${i18('authenticate.choose_option')}:\n${options}\n`,
        validate: (value: string) =>
          ['1', '2'].includes(value.trim()) ? true : i18('error.incorrect_value', { value: String(value) }),
      })

      switch (conclusion.error.trim()) {
      case '1':
        await this.logout()
        return this.ensurePlatformSession()
      case '2':
        return this.ensurePlatformSession()
      default:
        throw new Error(i18('error.no_reply'))
      }
    }

    const profile = await trpc.users.profile.query()
    Auth.user = profile.data
    printWelcome(profile.data.name)
    lastTry = undefined
    return profile.data
  }

  async logout(): Promise<void> {
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

  async defineBot(): Promise<void> {
    try {
      const bots = await trpc.bots.list.query({ page: '1', pageSize: '999' })
      const entries = bots.data as Array<{ id: number; name: string }>
      const botList = entries.map((bot, index) => `${index + 1}. ${bot.name}`).join('\n')

      const result = await prompts({
        type: 'text',
        name: 'bot',
        message: `${i18('authenticate.select_bot')}:\n${botList}\n`,
        validate: (value: string) => {
          const index = parseInt(value) - 1
          return !isNaN(index) && index >= 0 && index < entries.length
            ? true
            : i18('error.incorrect_value', { value: String(value) })
        },
      })

      const selectedBot = entries[parseInt(result.bot) - 1]
      await mergeStorageData({ botId: selectedBot.id })
      lastTry = undefined
      return this.validator()
    } catch (err) {
      log.error('Failed to fetch bot list')
      log.muted(String(err instanceof Error ? err.message : err))
      await this.ensurePlatformSession()
      return this.validator()
    }
  }

  async validator(): Promise<void> {
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

      if (!bot.data.enabled) log.warn(i18('error.disabled', { element: 'Bot' }))
      if (Auth.bot === undefined) this.startPeriodicValidation()

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
        validate: (value: string) =>
          ['1', '2', '3'].includes(value.trim()) ? true : i18('error.incorrect_value', { value }),
      })

      switch (conclusion.Error.trim()) {
      case '1':
        await this.defineBot()
        break
      case '2':
        await this.validator()
        break
      case '3':
        await this.logout()
        break
      default:
        throw new Error(i18('error.no_reply'))
      }
    }
  }

  startPeriodicValidation(): void {
    setInterval(() => this.validator(), 60_000)
  }
}
