import type { ConfigOptions } from '@/controller/config'
import { type ChildProcessWithoutNullStreams } from 'child_process'
import type { Metadata } from 'utils'

export type Plugin = {
  metadata?: Metadata,
  commands: { name: string, description: string, dmPermission: boolean, type: number }[]
  events: { name: string }[]
  components: { customId: string, cache: string, type: string }[]
  configs: ConfigOptions[]
  crons: string[]
  // signature: string
  // date: Date
  // size: string
}

export type PluginsOptions = {
  port: string
}

export interface PluginRunning extends Plugin {
  id?: string
  process?: ChildProcessWithoutNullStreams
  entries: string[]
  listen: boolean
}