import 'reflect-metadata'

import type { PluginContext, PluginMetadata, PluginModule } from 'discord'
import { metadata as getPackageMetadata } from 'utils'
import { registerAll } from './register.js'

export const metadata: PluginMetadata = {
  ...getPackageMetadata(),
  frameworkVersion: '^1.0.0',
}

export async function setup(ctx: PluginContext): Promise<void> {
  await registerAll(ctx)
}

export type { PluginModule }
