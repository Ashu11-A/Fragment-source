import type { PluginContext } from 'discord'

export type RawOption = { name: string; description?: string; type?: number; options?: RawOption[] }

export type PluginOptions = {
  frameworkVersion?: string
  setup(ctx: PluginContext): Promise<void>
}
