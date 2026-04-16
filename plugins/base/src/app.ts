import 'reflect-metadata'

import type { PluginContext, PluginMetadata, PluginModule } from 'discord'
import { metadata as getPackageMetadata } from 'utils'
import { registerAll } from './register.js'
import { database } from './database'

/**
 * Plugin metadata — validated by core before setup() is called.
 * `frameworkVersion` must be a semver range that satisfies core's FRAMEWORK_VERSION.
 */
export const metadata: PluginMetadata = {
  ...getPackageMetadata(),
  frameworkVersion: '^1.0.0',
}

/**
 * Called once by core when the plugin is loaded.
 * All commands, events, components, configs and crons must be registered here
 * via the provided PluginContext — no direct Discord connections allowed.
 */
export async function setup(ctx: PluginContext): Promise<void> {
  ctx.registerSchema(database)
  await registerAll(ctx)
}

// Re-export as PluginModule to satisfy the interface for type-checking tools
export type { PluginModule }
