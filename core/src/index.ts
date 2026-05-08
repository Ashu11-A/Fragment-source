export * from '@/singletons.js'
export type { CoreManifest, CoreMetadata, CoreOptions, CorePluginInfo } from '@/types/core.js'

import * as pkg from '../package.json' with { type: 'json' }
import { Logger } from '@/logs/logger.js'
import { banner } from './utils/ui.js'
import { Package } from 'utils'

Package.setData((pkg as unknown as { default: typeof pkg }).default)
const version = (pkg as unknown as { default?: { version?: string } }).default?.version ?? 'unknown'

new Logger()
await banner(version)

await import('./utils/lang.js')
await import('./register.js')
