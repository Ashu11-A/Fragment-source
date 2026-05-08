import type { PluginContext, EnvVarManifest } from 'discord'

export type { EnvVarManifest } from 'discord'

export type RawOption = { name: string; description?: string; type?: number; options?: RawOption[] }

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PluginRegistry {}

export type PluginDependencies = {
  core: string
} & Partial<Record<keyof PluginRegistry, string>>

export type PluginOptions = {
  dependencies: PluginDependencies
  envs?: readonly EnvVarManifest[]
  setup(ctx: PluginContext): Promise<void>
}
