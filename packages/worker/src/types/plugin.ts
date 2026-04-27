import type { PluginManifest } from 'discord'
import type { PluginRegistration } from '@/types/manager.js'
import type { Manager } from '@/controllers/Manager'

export type PluginEntry = {
  manager: Manager
  registration: PluginRegistration
  manifest?: PluginManifest
  fileURL: string
  pluginName: string
}

export type RegisterResult =
  | { ok: true; pluginName: string; filePath: string }
  | { ok: false; filePath: string; error: string; details?: string }

export type PluginCallbacks = {
  onPluginLoaded?: (pluginName: string, registration: PluginRegistration) => Promise<void>
  onPluginUnloaded?: (pluginName: string, registration: PluginRegistration) => Promise<void>
}
