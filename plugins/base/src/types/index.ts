import type { DatabaseRegistry as _DatabaseRegistry } from 'database'

declare module 'database' {
  interface DatabaseRegistry {
    base: typeof import('@/database').database
  }
}
