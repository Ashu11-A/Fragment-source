import { Command } from '@/discord/base/Commands.js'
import { PKG_MODE } from '@/index.js'
import { type Socket } from 'socket.io'
import { Config } from './config.js'
import { credentials, Crypt } from './crypt.js'
import { Database } from './database.js'
import { Plugins } from './plugins.js'
import { i18 } from '@/controller/lang.js'

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const optionalParams = (args?.optionalParams as any[]).map((param) => param instanceof Object ? JSON.stringify(param, null, 2): param)
        const pluginName = Plugins.running.find((plugin) => plugin.id ===  this.client.id)?.metadata?.name ??  this.client.id
        const type = args?.type as 'warn' | 'log' | 'error' | 'info' | undefined ?? 'log'

        console[type](`\n💠 Plugin ${pluginName}: ${message} ${optionalParams.join('\n')}\n`)
        return
      }
      if (eventName.split('_').includes('database')) { await database.events(this.client, eventName, args); return }
      await Plugins.events(this.client, eventName, args)
    })
    this.client.on('disconnect', async () => { await this.disconnect() })
    this.client.on('send_me_the_Discord_token_please', async () => {
      const token = credentials.get('token')
      
      if (token === undefined || typeof token !== 'string') throw new Error(i18('discord.token_not_found'))

      console.log(i18('discord.token_send', { isEncrypted: PKG_MODE ? ' criptografado' : '', pluginId: this.client.id }))
      this.client.emit('discord', PKG_MODE ? (await new Crypt().encript(token)) : token)
    })
  }

  async disconnect () {
    const pluginFind = Plugins.running.find((plugin) => plugin?.id === this.client.id)
    Config.all = Config.all.filter((config) => config.pluginId !== this.client.id)
    Command.all = Command.all.filter((command) => command.pluginId !== this.client.id && command.name !== 'config')
    Plugins.running = Plugins.running.filter((plugin) => plugin.id !== this.client.id)

    console.log()
    console.info(i18('plugins.disconnect', { name: pluginFind?.metadata?.name ?? this.client.id }))
    console.log()
  }
}
