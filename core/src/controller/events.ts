import { type Socket } from 'socket.io'
import { env } from '..'
import { Database } from './database'
import { Plugins } from './plugins'

interface EventOptions {
  client: Socket
}

export class Event {
  private readonly client
  constructor (options: EventOptions) {
    this.client = options.client
  }

  async controller () {
    const database = new Database()

    this.client.onAny(async (eventName: string, args) => {
      if (eventName.split('_').includes('database')) { await database.events(this.client, eventName, args); return }
      await Plugins.events(this.client, eventName, args)
    })
    this.client.on('disconnect', async () => { await this.disconnect() })
  }

  async connected () {
    this.client.emit('discord', env?.BOT_TOKEN)
  }

  async disconnect () {
    console.info(`\n🔌 Plugin Desconectado: ${Plugins.all[this.client.id]?.metadata?.name ?? this.client.id}\n`)
    delete Plugins.all[this.client.id]
  }
}
