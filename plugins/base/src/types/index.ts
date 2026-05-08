import type {} from 'database'
import type {} from 'plugin'

declare module 'database' {
  interface DatabaseRegistry {
    base: typeof import('@/database').database
  }
}

declare module 'plugin' {
  export interface PluginRegistry {
    'base': string
  }
}
