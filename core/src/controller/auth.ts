import { trpc, root, setAccessToken, setRefreshToken } from '@/singletons.js'
import { runDiscordOAuthLoopback } from '@/controller/discordOAuthLoopback.js'
import { storage } from '@/storage.js'
import type { DataCrypted } from '@/types/storage.js'
import type { FragmentPlatformUser } from '@/types/auth.js'
import { log, printWelcome, section, spinner } from '@/ui.js'
import { rm } from 'fs/promises'
import prompts, { type PromptObject } from 'prompts'
import type { Bot } from 'server/src/database/entity/Bot'
import { setServerSocketBotId } from '@/events/socket'

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
    await storage.append('.data', { token: response.token.trim() }, { isJson: true })
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
    const refresh = data?.refreshToken?.token
    if (typeof token === 'string' && token.length > 0) {
      setAccessToken(token)
      if (typeof refresh === 'string' && refresh.length > 0) {
        setRefreshToken(refresh)
      }
      const spin = spinner('Restoring session...').start()
      try {
        const profile = await trpc.users.profile.query()
        Auth.user = profile.data
        spin.succeed('Signed in')
        printWelcome(profile.data.name)
        lastTry = undefined
        return profile.data
      } catch (err) {
        const shape = (err as unknown as { shape?: { code?: string } }).shape
        const isAuthError =
          err instanceof Error &&
          shape?.code !== undefined &&
          ['UNAUTHORIZED', 'FORBIDDEN'].includes(shape.code)

        if (isAuthError && typeof refresh === 'string' && refresh.length > 0) {
          spin.text = 'Refreshing session...'
          try {
            const result = await trpc.auth.refresh.mutate()
            setAccessToken(result.data.accessToken.token)
            setRefreshToken(result.data.refreshToken.token)
            await storage.append('.data', {
              accessToken: result.data.accessToken as DataCrypted['accessToken'],
              refreshToken: result.data.refreshToken as DataCrypted['refreshToken'],
            }, { isJson: true })
            const profile = await trpc.users.profile.query()
            Auth.user = profile.data
            spin.succeed('Signed in')
            printWelcome(profile.data.name)
            lastTry = undefined
            return profile.data
          } catch (refreshErr) {
            spin.fail('Session expired or invalid')
            log.error(String(refreshErr instanceof Error ? refreshErr.message : refreshErr))
            setAccessToken(undefined)
            setRefreshToken(undefined)
            const cur = (await storage.load('.data', { isJson: true })) ?? {}
            delete cur.accessToken
            delete cur.refreshToken
            await storage.append('.data', cur as DataCrypted, { isJson: true })
          }
        } else {
          spin.fail('Session expired or invalid')
          log.error(String(err instanceof Error ? err.message : err))
          if (isAuthError) {
            setAccessToken(undefined)
            setRefreshToken(undefined)
            const cur = (await storage.load('.data', { isJson: true })) ?? {}
            delete cur.accessToken
            delete cur.refreshToken
            await storage.append('.data', cur as DataCrypted, { isJson: true })
          }
        }
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
    setRefreshToken(undefined)
    Auth.user = undefined
    await this.ensurePlatformSession()
    await this.validator()
  }

  async defineBot(): Promise<void> {
    try {
      const bots = await trpc.bots.list.query({ page: '1', pageSize: '999' })
      const entries = bots.data as Array<{ id: number; name: string }>

      if (entries.length === 0) {
        log.warn(i18('authenticate.no_bots'))
        return this.createBot()
      }

      const botList = [
        `0. ${i18('authenticate.create_bot')}`,
        ...entries.map((bot, index) => `${index + 1}. ${bot.name}`),
      ].join('\n')

      const result = await prompts({
        type: 'text',
        name: 'bot',
        message: `${i18('authenticate.select_bot')}:\n${botList}\n`,
        validate: (value: string) => {
          const index = parseInt(value)
          return !isNaN(index) && index >= 0 && index <= entries.length
            ? true
            : i18('error.incorrect_value', { value: String(value) })
        },
      })

      const selectedIndex = parseInt(result.bot)
      if (selectedIndex === 0) {
        return this.createBot()
      }

      const selectedBot = entries[selectedIndex - 1]
      await storage.append('.data', { botId: selectedBot.id }, { isJson: true })
      lastTry = undefined
      return this.validator()
    } catch (err) {
      log.error('Failed to fetch bot list')
      log.muted(String(err instanceof Error ? err.message : err))
      await this.ensurePlatformSession()
      return this.validator()
    }
  }

  async createBot(): Promise<void> {
    const result = await prompts({
      type: 'text',
      name: 'name',
      message: `${i18('authenticate.bot_name')}:\n`,
      validate: (value: string) =>
        value.trim().length > 0 ? true : i18('error.incorrect_value', { value: String(value) }),
    })

    if (!result.name?.trim()) {
      throw new Error(i18('error.no_reply'))
    }

    try {
      const response = await trpc.bots.create.mutate({ name: result.name.trim(), enabled: true })
      const bot = response.data.bot as unknown as Bot

      await storage.append('.data', { botId: bot.id }, { isJson: true })
      lastTry = undefined

      if (!bot.enabled) log.warn(i18('error.disabled', { element: 'Bot' }))
      if (Auth.bot === undefined) this.startPeriodicValidation()

      Auth.bot = bot
      setServerSocketBotId(bot.id)
    } catch (err) {
      log.error('Failed to create bot')
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
        `(4) ${i18('authenticate.create_bot')}`,
      ].join('\n')

      const conclusion = await prompts({
        name: 'Error',
        type: 'text',
        message: `${i18('error.an_error_occurred', { element: err instanceof Error ? err.message : '' })}\n${options}\n`,
        validate: (value: string) =>
          ['1', '2', '3', '4'].includes(value.trim()) ? true : i18('error.incorrect_value', { value }),
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
      case '4':
        await this.createBot()
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
