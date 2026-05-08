import '@/register.js'
import '@/types/database.js'
import 'dotenv/config'
import 'reflect-metadata'

import { Core } from '@/controller/core.js'
import { database } from '@/index.js'
import { log } from './utils/ui.js'

export default new Core({
  onPluginLoaded: async (pluginName, registration) => {
    if (registration.entities.length > 0) {
      await database.register(pluginName, registration.entities)
    }
    log.success(`Plugin "${pluginName}" loaded with ${registration.entities.length} entities`)
  },
  onPluginUnloaded: async (pluginName) => {
    await database.unregister(pluginName)
    log.info(`Plugin "${pluginName}" unloaded`)
  },
})