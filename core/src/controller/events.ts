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
        const message = args?.message instanceof Object ? JSON.stringify(args?.message, null, 2) : args?.message
        const optionalParams: any[] = (args?.optionalParams as any[]).map((param) => param instanceof Object ? JSON.stringify(param, null, 2): param)
        const pluginName = Plugins.running.find((plugin) => plugin.id ===  this.client.id)?.metadata?.name ??  this.client.id
        const type = args?.type as 'warn' | 'log' | 'error' | 'info' | undefined ?? 'log'

        console[type](`Plugin ${pluginName}: ${message} ${optionalParams.join('\n')}`)
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
