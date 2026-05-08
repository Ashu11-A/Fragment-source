import { state } from '@/singletons'
import { log } from '@/utils/ui'
import { startDiscord } from 'discord'
import type { Client } from 'discord.js'

export class DiscordClient {
  private readonly token?: string
  private _client?: {
    client: Client<boolean>;
    imports: { module: unknown; filepath: string }[];
  }
  
  constructor (token = state.discordToken) {
    this.token = token
  }

  get client(): { client: Client<boolean>; imports: { module: unknown; filepath: string }[] } {
    if (!this._client) throw new Error('Client of Discord not defined!')

    return this._client
  }

  async start(): Promise<void> {
    const token = this.token ?? state.discordToken
    if (!token) {
      log.warn('No Discord token configured — skipping Discord initialization')
      return
    }

    try {
      this._client = await startDiscord({
        meta: import.meta,
        token,
        modules: [
          './src/discord/**/*.ts',
          '../plugins/*/src/discord/**/*.ts',
        ]
      })

      log.success('Discord connected')
    } catch (error) {
      log.error(`Discord connection failed: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }
}
