import { type ClientEvents } from 'discord.js'

interface EventData<Key extends keyof ClientEvents> {
  name: Key
  once?: boolean
  run (...args: ClientEvents[Key]): void
}

export class DiscordEvent<Key extends keyof ClientEvents> {
  public static all: Array<EventData<keyof ClientEvents>> = []
  constructor (data: EventData<Key>) {
    DiscordEvent.all.push(data)
  }
}
