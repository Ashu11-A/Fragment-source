import { Discord } from '@/discord/base/Client.js'
import { isPKG as PKG_MODE } from '@/index.js'
import { storage } from '@/storage.js'
import { Command, type CommandData } from 'discord'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { cwd } from 'process'
import type { Socket } from 'socket.io'
import type { BaseEntity } from 'typeorm'
import { fileURLToPath } from 'url'
import { isPKG } from 'utils'
import { Plugin } from 'worker'
import type { DiscordMetadata } from 'worker/src/types/discord.js'
import { Config } from './config.js'
import { Database, type EntityImport } from './database.js'

export class Event {
  database = new Database()
  constructor (private readonly client: Socket) {}

  async controller () {
    this.client.onAny(async (eventName: string, args) => {
      if (eventName.split('_').includes('database')) {
        try {
          const start = performance.now()
          const result = await this.database.query(args)
        
          this.client.emit(eventName, result)
        
          const end = performance.now()
          console.log(`🛎️  [${args.plugin}]: Database -> ${args.type} [${(end - start).toFixed(2)} ms]`)
        } catch (err) {
          console.log(err)
          this.client.emit(`${eventName}_error`, err)
        }
        return
      }

      console.log('evento: ', eventName)

      switch (eventName) {
      case 'entries': {
        const data = args as { typescript: Record<string, string>, javascript: Record<string, string> }
        const entries = isPKG(dirname(fileURLToPath(import.meta.url))) ? data.javascript : data.typescript
        const plugin = Plugin.all.get(this.client.id)
        if (!plugin) {
          console.log('Plugin é undefined: entries')
          return
        }        
  
        for (const [fileName, code] of Object.entries(entries)) {
          const path = join(cwd(), 'entries')
          const entryName = join(plugin.manager.metadata.name, fileName)
          const filePath = join(path, entryName)
  
          if (!existsSync(path)) await mkdir(path, { recursive: true })
          await mkdir(dirname(filePath), { recursive: true })
          await writeFile(filePath, code, { encoding: 'utf-8' })
        }
  
        for (const fileName of Object.keys(entries)) {
          const path = join(cwd(), 'entries')
          const entryName = join(plugin.manager.metadata.name, fileName)
          const filePath = join(path, entryName)
          const entry = await import(filePath) as EntityImport<typeof BaseEntity>

          this.database.entries = Object.assign(this.database.entries, ({ [entryName]: entry }))
        }
        console.log(this.database.entries)
          
        Plugin.all.set(this.client.id, { ...plugin, entries: args })

        console.log(i18('database.starting'))
    
        if (this.database.client.isInitialized) {
          await this.database.client.destroy()
        }
        await this.database.init()
  
        this.client.emit('entries_ok')
        break
      }
      case 'discord_metadata': {
        const discord = args as DiscordMetadata
        const data = await storage.load('.data', { isJson: true })
        const token = data?.token
        if (!token) { console.log('Token é undefined'); return }

        const plugin = Plugin.all.get(this.client.id)
        if (!plugin) { console.log('Plugin é undefined: discord_metadata'); return }

        for (const command of discord.commands as Array<CommandData<boolean>>) {
          Command.all.set(command.name, Object.assign(command, { pluginId: this.client.id }))
        }

        console.log(JSON.stringify(Command.all, null, 2))

        for (const config of discord.configs) new Config({ ...config, pluginId: this.client.id })

        console.log()
        console.log(i18('plugins.starting', { name: plugin.manager.metadata.name }))
        console.log('  ', i18('plugins.commands', { length: discord.commands.length }))
        console.log('  ', i18('plugins.components', { length: discord.components.length }))
        console.log('  ', i18('plugins.events', { length: discord.events.length }))
        console.log('  ', i18('plugins.configs', { length: discord.configs.length }))
        console.log('  ', i18('plugins.crons', { length: discord.crons.length }))
        console.log()
        
        Plugin.all.set(this.client.id, {
          ...plugin,
          discord
        })

        this.client.emit('discord_metadata_ok')

        break
      }
      case 'send_me_the_Discord_token_please': {
        const data = await storage.load('.data', { isJson: true })
        const token = data?.token
        const plugin = Plugin.all.get(this.client.id)
        if (!plugin) {
          console.log('Plugin é undefined: send_me_the_Discord_token_please')
          return
        }
      
        if (typeof token !== 'string') throw new Error(i18('discord.token_not_found'))
        if (Discord.client) {
          console.log(i18('discord.close'))
          await Discord.client.destroy()
        }
        await new Discord().start(token)

        console.log(i18('discord.token_send', {
          isEncrypted: PKG_MODE ? ' ' + i18('crypt.encrypted') : '',
          plugin: plugin?.manager?.metadata?.name ?? this.client.id
        }))

        this.client.emit('discord_token', await storage.crypt?.encrypt(token))
        break
      }
      case 'disconnect': {
        await this.disconnect()
        break
      }
      }
    })
  }

  async disconnect () {
    const plugin = Plugin.all.get(this.client.id)
    if (!plugin) return
    
    Config.all = Config.all.filter((config) => config.pluginId !== this.client.id)
    Command.all = Command.all.filter((command) => command.pluginId !== this.client.id && command.name !== 'config')
    Plugin.all.delete(this.client.id)

    console.log()
    console.info(i18('plugins.disconnect', { name: plugin.manager.metadata.name ?? this.client.id }))
    console.log()
  }
}
