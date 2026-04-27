import Config from './entity/Config.entry.js'
import Guild from './entity/Guild.entry.js'
import User from './entity/User.entry.js'

export const database = {
  guild: Guild,
  config: Config,
  user: User,
} as const

import type { DatabaseRegistry as _DatabaseRegistry } from 'database'

declare module 'database' {
  interface DatabaseRegistry {
    base: typeof database
  }
}
