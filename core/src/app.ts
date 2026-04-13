import 'dotenv/config'
import 'reflect-metadata'
import './register.js'

import { Auth } from '@/controller/auth.js'
import { db } from '@/controller/database.js'
import { Discord } from '@/discord/base/Client.js'
import { storage } from '@/storage.js'
import { Plugin } from 'worker'

// ── Discord bootstrap ────────────────────────────────────────────────────────
// Core maintains a single Discord.js connection shared by all plugins.
// The token is retrieved from encrypted local storage, set up during Auth.checker().
async function startDiscord(): Promise<void> {
  const data = await storage.load('.data', { isJson: true })
  const token = data?.token
  if (typeof token !== 'string') {
    console.warn('[Core] No Discord token found — skipping Discord initialisation.')
    return
  }
  console.log(token)
  await new Discord().start(token)
}

// ── Auth & license ───────────────────────────────────────────────────────────
await new Auth().checker()

// ── Plugin loader ────────────────────────────────────────────────────────────
// Plugins are loaded as in-memory ES modules (no Worker threads, no per-plugin
// Discord connections). Core provides each plugin with a PluginContext that
// gives type-safe access to command registration, event subscription, etc.
const discord = new Discord()

const plugin = new Plugin({
  database: db,

  onPluginLoaded: async (_pluginId, registration) => {
    // 1. Register TypeORM entities the plugin declared
    if (registration.entities.length > 0) {
      await db.registerPluginEntities(_pluginId, registration.pluginName, registration.entities)
    }

    // 2. Ensure Discord is connected (lazy — first plugin triggers login)
    if (!Discord.client) {
      await startDiscord()
    }

    // 3. Attach the plugin's event handlers to the live Discord client
    discord.attachPluginEvents(registration)

    // 4. Re-register all slash commands so the new plugin's commands appear
    await discord.register()
  },

  onPluginUnloaded: async (_pluginId, registration) => {
    // Detach event handlers before the plugin is removed from memory
    discord.detachPluginEvents(registration)

    // Remove orphaned entities from the DataSource
    await db.unregisterPlugin(_pluginId, registration.pluginName)

    // Re-register commands so removed plugin's commands disappear
    await discord.register()
  },
})

plugin.watcher()
