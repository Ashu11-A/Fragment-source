import type { ClientEvents } from 'discord.js'

/** Discord.js client event registrations from `ctx.event`. */
export interface PluginDiscordEventData<Key extends keyof ClientEvents = keyof ClientEvents> {
  name: Key
  once?: boolean
  pluginId?: string
  run (...args: ClientEvents[Key]): void
}

export const discordEventListeners: Array<PluginDiscordEventData<keyof ClientEvents>> = []
