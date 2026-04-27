import 'dotenv/config'
import 'reflect-metadata'
import '@/register.js'
import '@/types/database.js'

import { Auth } from '@/controller/auth.js'
import { License } from '@/controller/license.js'
import { database } from '@/index.js'
import { storage } from '@/storage.js'
import { log, section, spinner } from '@/ui.js'
import { startDiscord } from 'discord'
import { Plugin } from 'worker'
import { registerPluginHandlers } from '@/pluginRequest.js'
import { activity } from '@/logs/activity.js'

class DiscordBot {
  async start(): Promise<void> {
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
        token,
        modules: [
          './src/discord/**/*.ts',
          '../plugins/*/src/discord/**/*.ts',
        ],
      })
      spin.succeed('Discord connected')
      activity.success('discord', 'Discord gateway connected', { userId: Auth.user?.id })
    } catch (err) {
      spin.fail('Discord connection failed')
      activity.error('discord', `Discord connection failed: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }
}

await new License().checker()
await new Auth().checker()

export const plugin = new Plugin({
  onPluginLoaded: async (pluginName, registration) => {
    if (registration.entities.length > 0) {
      await database.register(pluginName, registration.entities)
    }
    activity.success('plugin', `Plugin "${pluginName}" loaded`, {
      entities: registration.entities.length,
    })
  },
  onPluginUnloaded: async (pluginName) => {
    await database.unregister(pluginName)
    activity.info('plugin', `Plugin "${pluginName}" unloaded`)
  },
})

await plugin.loadExistingBundles()
await new DiscordBot().start()

plugin.watcher()

await registerPluginHandlers()
