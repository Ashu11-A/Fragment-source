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
      if (eventName === 'console') {
        console[args?.type as 'warn' | 'log' | 'error' | 'info' | undefined ?? 'log']
        (`Plugin ${Plugins.running.find((plugin) => plugin.id ===  this.client.id)?.metadata?.name ??  this.client.id}: ${args?.message} ${args?.optionalParams}`)
        return
      }
      if (eventName.split('_').includes('database')) { await database.events(this.client, eventName, args); return }
      await Plugins.events(this.client, eventName, args)
    })
    this.client.on('disconnect', async () => { await this.disconnect() })
  }

  async connected () {
    this.client.emit('discord', env?.BOT_TOKEN)
  }

  async disconnect () {
    const pluginFind = Plugins.running.map((plugin, index) => ({ plugin, index })).find(({ plugin }) => plugin?.id === this.client.id)
    if (pluginFind) {
      const { plugin, index } = pluginFind
  
      console.info(`\n🔌 Plugin Desconectado: ${plugin.metadata?.name}\n`)
      Plugins.running.splice(index, 1)
      return
    }
    console.info(`\n🤔 Plugin sem registro se desconectou: ${this.client.id}\n`)
  }
}
