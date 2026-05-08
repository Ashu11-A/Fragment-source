import type { PluginRegistration } from 'worker'

export type CoreMetadata = {
  name: string
  version: string
  description: string
  author: string | { name: string; email: string }
  license: string
}

export type CorePluginInfo = {
  name: string
  version?: string
  commands: string[]
  entities: string[]
}

export type CoreManifest = {
  metadata: CoreMetadata
  plugins: CorePluginInfo[]
  botId?: number
}

export type CoreOptions = {
  onPluginLoaded?: (pluginName: string, registration: PluginRegistration) => Promise<void>
  onPluginUnloaded?: (pluginName: string, registration: PluginRegistration) => Promise<void>
}
