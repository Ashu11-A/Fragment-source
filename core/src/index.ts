export * from '@/singletons.js'

import * as pkg from '../package.json' with { type: 'json' }
import { banner } from '@/ui.js'
import { root } from '@/singletons.js'
import { Logger } from '@/logs/logger.js'

const version = (pkg as unknown as { default?: { version?: string } }).default?.version ?? 'unknown'

new Logger(root)
await banner(version)

await import('./lang.js')
await import('./register.js')
