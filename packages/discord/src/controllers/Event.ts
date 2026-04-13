import { type ClientEvents } from 'discord.js'

export interface EventData<Key extends keyof ClientEvents> {
  name: Key
  once?: boolean
  /** Assigned by core when registered via PluginContext */
  pluginId?: string
  run (...args: ClientEvents[Key]): void
}

export class Event<Key extends keyof ClientEvents> {
  public static all: Array<EventData<keyof ClientEvents>> = []
  constructor (data: EventData<Key>) {
    Event.all.push(data)
  }
}
