import { state, storage, trpc } from '@/singletons.js'
import type { FragmentPlatformUser } from '@/types/auth.js'
import type { DataCrypted } from '@/types/storage.js'
import { log, printWelcome, spinner } from '@/utils/ui'

export class Auth {
  public static user: FragmentPlatformUser | undefined
  public static botId: number | undefined

  async authenticate(accessToken: string, refreshToken?: string): Promise<void> {
    state.accessToken = accessToken
    if (refreshToken) state.refreshToken = refreshToken

    const spin = spinner('Authenticating with server...').start()
    try {
      const profile = await trpc.users.profile.query()
      Auth.user = profile
      spin.succeed('Authenticated')
      printWelcome(profile.name)
    } catch (error) {
      spin.fail('Authentication failed')
      throw error
    }
  }

  async restoreSession(): Promise<boolean> {
    const data = await storage.load('.data', { isJson: true })
    const token = data?.accessToken?.token
    const refresh = data?.refreshToken?.token

    if (typeof token !== 'string' || token.length === 0) {
      return false
    }

    state.accessToken = token
    if (typeof refresh === 'string' && refresh.length > 0) {
      state.refreshToken = refresh
    }

    const spin = spinner('Restoring session...').start()
    try {
      const profile = await trpc.users.profile.query()
      Auth.user = profile
      spin.succeed('Session restored')
      printWelcome(profile.name)
      return true
    } catch {
      spin.fail('Session expired')
      await this.clearSession()
      return false
    }
  }

  async refreshSession(): Promise<boolean> {
    const data = await storage.load('.data', { isJson: true })
    const refresh = data?.refreshToken?.token

    if (typeof refresh !== 'string' || refresh.length === 0) {
      return false
    }

    try {
      const result = await trpc.auth.refresh.mutate()
      state.accessToken = result.data.accessToken.token
      state.refreshToken = result.data.refreshToken.token

      await storage.append(
        '.data',
        {
          accessToken: result.data.accessToken as DataCrypted['accessToken'],
          refreshToken: result.data.refreshToken as DataCrypted['refreshToken'],
        },
        { isJson: true }
      )

      return true
    } catch {
      await this.clearSession()
      return false
    }
  }

  async configureBot(botId: number): Promise<void> {
    try {
      const bot = await trpc.bots.get.query({ id: botId })
      Auth.botId = bot.id
      await storage.append('.data', { botId: bot.id }, { isJson: true })
      log.success(`Bot "${bot.name}" configured`)
    } catch (error) {
      log.error('Failed to configure bot')
      throw error
    }
  }

  private async clearSession(): Promise<void> {
    state.accessToken = undefined
    state.refreshToken = undefined
    Auth.user = undefined
    const data = (await storage.load('.data', { isJson: true })) ?? {}
    delete data.accessToken
    delete data.refreshToken
    await storage.append('.data', data as DataCrypted, { isJson: true })
  }
}
