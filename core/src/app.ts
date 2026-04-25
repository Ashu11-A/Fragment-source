/// <reference path="./types/database.ts" />
import 'dotenv/config'
import 'reflect-metadata'
import './register.js'

import { installCorePluginRequestHandlers } from './corePluginRequest.js'
import { Auth } from '@/controller/auth.js'
import { coreActivity } from '@/activity.js'
import { database } from '@/index.js'
import { storage } from '@/storage.js'
import { log, section, spinner } from '@/ui.js'
import { startDiscord } from 'discord'
import { Plugin } from 'worker'

// ── Discord bootstrap ────────────────────────────────────────────────────────
async function startDiscordBot(): Promise<void> {
  const data = await storage.load('.data', { isJson: true })
  const token = data?.token
  if (typeof token !== 'string') {
    log.warn('No Discord token found — skipping Discord initialisation.')
    return
  }

  section('Discord')
  const spin = spinner('Connecting to Discord...').start()
  try {
    await startDiscord({
      meta: import.meta,
      token: token,
      modules: [
        './src/discord/**/*.ts',
        '../plugins/*/src/discord/**/*.ts'
      ]
    })
    spin.succeed('Discord connected')
    coreActivity.success('discord', 'Discord gateway connected', { userId: Auth.user?.id })
  } catch (err) {
    spin.fail('Discord connection failed')
    coreActivity.error('discord', `Discord connection failed: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  }
}

// ── Auth & license ───────────────────────────────────────────────────────────
await new Auth().checker()

// ── Plugin loader ────────────────────────────────────────────────────────────
export const plugin = new Plugin({
  onPluginLoaded: async (pluginName, registration) => {
    if (registration.entities.length > 0) {
      await database.register(pluginName, registration.entities)
    }
    coreActivity.success('plugin', `Plugin "${pluginName}" loaded`, {
      entities: registration.entities.length,
    })
  },
  onPluginUnloaded: async (pluginName) => {
    await database.unregister(pluginName)
    coreActivity.info('plugin', `Plugin "${pluginName}" unloaded`)
  },
})

await plugin.loadExistingBundles()
await startDiscordBot()

plugin.watcher()

await installCorePluginRequestHandlers()

