import { Auth } from '@/controller/auth.js'
import { DiscordClient } from '@/controller/discord.js'
import { License } from '@/controller/license.js'
import { state, storage } from '@/singletons.js'
import type { CoreManifest, CoreMetadata, CoreOptions } from '@/types/core.js'
import { metadata as getPackageMetadata } from 'utils'
import { Plugin } from 'worker'

/**
 * Orchestrates the Fragment core process.
 *
 * Declare it in `core/src/app.ts` and call `core.start()` to boot:
 *
 * @example
 * ```ts
 * import { Core } from '@/Core.js'
 * import { database } from '@/index.js'
 *
 * export const core = new Core({
 *   onPluginLoaded: async (name, reg) => {
 *     if (reg.entities.length > 0) await database.register(name, reg.entities)
 *   },
 *   onPluginUnloaded: async (name) => {
 *     await database.unregister(name)
 *   },
 * })
 *
 * export const { plugin, discord: discordClient } = core
 * await core.start()
 * ```
 */
export class Core {
  /** Metadata read from core's `package.json` at construction time. */
  readonly metadata: CoreMetadata

  /** Plugin manager — loads, unloads and watches plugin bundles. */
  readonly plugin: Plugin

  /** Discord client — connects to Discord after auth completes. */
  readonly discord: DiscordClient

  private handlersInstalled = false

  constructor(private readonly options: CoreOptions = {}) {
    this.metadata = getPackageMetadata() as CoreMetadata

    this.plugin = new Plugin({
      onPluginLoaded: options.onPluginLoaded,
      onPluginUnloaded: options.onPluginUnloaded,
    })

    this.discord = new DiscordClient()

    // Auto-start when the FRAGMENT_RUN env var is set (container / dev run).
    // Without it the module can be imported for inspection without side effects.
    if (process.env.FRAGMENT_RUN) {
      void this.start().catch((err: unknown) => {
        console.error('[core] startup failed:', err instanceof Error ? err.message : err)
        process.exit(1)
      })
    }
  }

  /**
   * Returns a snapshot of the core's current state: its own metadata plus
   * the list of all currently loaded plugins with their commands and entities.
   *
   * Safe to call at any time after construction.
   */
  inspect(): CoreManifest {
    const plugins: CoreManifest['plugins'] = [...Plugin.all.entries()].map(([name, entry]) => ({
      name,
      version: entry.manifest?.metadata.version,
      commands: entry.registration.commandNames,
      entities: entry.registration.entities.map((e) => (e as { name: string }).name),
    }))

    return {
      metadata: this.metadata,
      plugins,
      botId: state.botId,
    }
  }

  /**
   * Runs the full startup sequence:
   * authenticate → connect socket → license check → load plugins → start Discord → watch plugins
   */
  async start(): Promise<void> {
    await this._authenticate()
    await this._connectSocket()
    await this._checkLicense()
    await this.plugin.load()
    await this.discord.start()
    this.plugin.watcher()
    await this._installPluginHandlers()
  }

  // ─── Private boot steps ─────────────────────────────────────────────────────

  private async _authenticate(): Promise<void> {
    const auth = new Auth()
    const sessionRestored = await auth.restoreSession()

    if (!sessionRestored) {
      const accessToken = process.env.FRAGMENT_ACCESS_TOKEN
      const refreshToken = process.env.FRAGMENT_REFRESH_TOKEN

      if (!accessToken) {
        throw new Error('FRAGMENT_ACCESS_TOKEN environment variable is required')
      }

      await auth.authenticate(accessToken, refreshToken)
    }

    const botId = state.botId || parseInt(process.env.FRAGMENT_BOT_ID || '', 10)
    if (botId && !isNaN(botId)) {
      await auth.configureBot(botId)

      const { setServerSocketBotId } = await import('@/events/socket.js')
      setServerSocketBotId(botId)
    }
  }

  private async _connectSocket(): Promise<void> {
    const accessToken = state.accessToken
    if (!accessToken) {
      throw new Error('Missing access token for core socket authentication')
    }

    const { connectSocket } = await import('@/events/socket.js')
    connectSocket(accessToken)

    const data = await storage.load('.data', { isJson: true })
    const storedToken = data?.token
    if (storedToken) {
      state.discordToken = storedToken
    }
  }

  private async _checkLicense(): Promise<void> {
    await new License().checker()
  }

  private async _installPluginHandlers(): Promise<void> {
    if (this.handlersInstalled) return

    const { coreSocketManager } = await import('@/events/socket.js')
    const socket = coreSocketManager.getTypedClient()

    if (socket == null) {
      console.warn('[core:plugin] socket not initialised — plugin request handlers not installed')
      return
    }

    this.handlersInstalled = true

    const { corePluginRequest } = await import('@/events/core/pluginRequest.js')
    corePluginRequest.register(socket as never)
  }
}
