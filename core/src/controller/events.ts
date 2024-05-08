import { Discord } from '@/discord/Client'
import { DiscordCommand, type CommandData } from '@/discord/Commands'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { cwd } from 'process'
import { type Socket } from 'socket.io'
import { type BaseEntity, type FindOptionsWhere, type ObjectId } from 'typeorm'
import { PKG_MODE, RootPATH, env } from '..'
import { Database } from './database'
import { Plugins } from './plugins'
import { existsSync } from 'fs'

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
    const plugins = new Plugins()

    this.client.onAny(async (eventName: string, args) => {
      if (eventName.split('_').includes('database')) { await database.events(this.client, eventName, args); return }
      await plugins.events(this.client, eventName, args)
    })
    this.client.on('disconnect', async () => { await this.disconnect() })
  }

  async connected () {
    this.client.emit('discord', env?.BOT_TOKEN)
  }

  async disconnect () {
    console.info(`\n🔌 Plugin Desconectado: ${Plugins.all[this.client.id].name}\n`)
  }
}
