import { Command } from '@/discord/Commands'
import { type Socket } from 'socket.io'
import { Auth } from './auth'
import { Config } from './config'
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

        console[type](`\n💠 Plugin ${pluginName}: ${message} ${optionalParams.join('\n')}\n`)
        return
      }
      if (eventName.split('_').includes('database')) { await database.events(this.client, eventName, args); return }
      await Plugins.events(this.client, eventName, args)
    })
    this.client.on('disconnect', async () => { await this.disconnect() })
  }

  connected () {
    if (Auth.bot?.token === undefined) throw new Error('Token do Discord está vazio!')
    console.log(`⚠️ Token sendo enviado para: ${this.client.id}`)
    this.client.emit('discord', Auth.bot.token)
  }

  async disconnect () {
    const pluginFind = Plugins.running.find((plugin) => plugin?.id === this.client.id)
    Config.all = Config.all.filter((config) => config.pluginId !== this.client.id)
    Command.all = Command.all.filter((command) => command.pluginId !== this.client.id && command.name !== 'config')
    Plugins.running = Plugins.running.filter((plugin) => plugin.id !== this.client.id)
    
    console.info(`\n🔌 Plugin Desconectado: ${pluginFind?.metadata?.name ?? this.client.id}\n`)
  }
}
