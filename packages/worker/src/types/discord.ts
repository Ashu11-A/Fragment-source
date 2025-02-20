import type { ApplicationCommandSubCommandData } from 'discord.js'

export interface ConfigOptions extends ApplicationCommandSubCommandData {
  name: string
  pluginId: string
}

export type DiscordMetadata = {
  commands: { name: string, description: string, dmPermission: boolean, type: number }[]
  events: { name: string }[]
  components: { customId: string, cache: string, type: string }[]
  configs: ConfigOptions[]
  crons: string[]
}
