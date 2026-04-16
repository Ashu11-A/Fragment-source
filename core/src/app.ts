/// <reference path="./types/database.ts" />
import 'dotenv/config'
import 'reflect-metadata'
import './register.js'

import { Auth } from '@/controller/auth.js'
import { database } from '@/controller/database.js'
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
  } catch (err) {
    spin.fail('Discord connection failed')
    throw err
  }
}

// ── Auth & license ───────────────────────────────────────────────────────────
await new Auth().checker()

// ── Plugin loader ────────────────────────────────────────────────────────────
const plugin = new Plugin({
  onPluginLoaded: async (_pluginId, registration) => {
    if (registration.entities.length > 0) {
      await database.registerPluginEntities(_pluginId, registration.pluginName, registration.entities)
    }
  },

  onPluginUnloaded: async (_pluginId, registration) => {
    await database.unregisterPlugin(_pluginId, registration.pluginName)
  },
})

await plugin.loadExistingBundles()
await startDiscordBot()

plugin.watcher()

