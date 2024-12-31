import { PKG_MODE } from '@/index.js'
import { credentials, Crypt } from 'crypt'
import { Command, Discord, type CommandData } from 'discord'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { cwd } from 'process'
import { BaseEntity } from 'typeorm'
import { Plugin } from 'worker'
import { Config } from './config.js'
import { Database, type EntityImport } from './database.js'
import type { Socket } from 'socket.io'

export class Event {
  constructor (private readonly client: Socket) {}

  async controller () {
    const database = new Database()

    this.client.onAny(async (eventName: string, args) => {
      if (eventName === 'console') {
        const message = args?.message instanceof Object ? JSON.stringify(args?.message, null, 2) : args?.message
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const optionalParams = (args?.optionalParams as any[]).map((param) => param instanceof Object ? JSON.stringify(param, null, 2): param)
        const pluginName = Array.from(Plugin.plugins).find(([, { websocket }]) => websocket.id ===  this.client.id)?.[1].manager.metadata.name ??  this.client.id
        const type = args?.type as 'warn' | 'log' | 'error' | 'info' | undefined ?? 'log'

        console[type](`\n💠 Plugin ${pluginName}: ${message} ${optionalParams.join('\n')}\n`)
        return
      }
      
      if (eventName.split('_').includes('database')) { await database.events(this.client, eventName, args); return }

      switch (eventName) {
      case 'info': {
        const info = args as Plugin
      
        const index = Plugin.running.findIndex((plugin) => plugin.id === this.client.id)
        const process = Plugin.running[index]
      
        if (index !== -1) {
          if (process?.listen === true) {
            console.log(i18('plugins.duplicate', { name: info.metadata?.name ?? this.client.id }))
            this.client.emit('kill')
            Plugin.running.splice(index, 1)
            break
          } else {
            Plugin.running[index] = Object.assign(Plugin.running[index], info, { listen: true })
          }
        } else {
          Plugin.running.push(Object.assign(info,
            {
              entries: [],
              id: this.client.id,
              listen: true
            }
          ))
        }
      
        for (const pathFile of Plugin.running[index].entries) {
          const split = pathFile.split('/') // /home/ashu/Documentos/GitHub/PaymentBot-source/core/entries/utils/Config.entry.ts
          const fileName = `${split[split.length - 2]}/${split[split.length - 1]}` // utils/Config.entry.ts
          const entry = await import(pathFile) as EntityImport<typeof BaseEntity>
      
          Object.assign(Database.entries, ({ [fileName]: entry }))
          console.log(i18('plugins.entry_load', { name: fileName.split('.')[0] }))
        }
      
        for (const command of ((info.commands ?? []) as Array<CommandData<boolean>>)) {
          Command.all.set(command.name, Object.assign(command, { pluginId: this.client.id }))
        }
        console.log()
        console.log(i18('plugins.starting', { name: info.metadata?.name }))
        console.log('  ', i18('plugins.commands', { length: info.commands.length }))
        console.log('  ', i18('plugins.components', { length: info.components.length }))
        console.log('  ', i18('plugins.events', { length: info.events.length }))
        console.log('  ', i18('plugins.configs', { length: info.configs.length }))
        console.log('  ', i18('plugins.crons', { length: info.crons.length }))
      
        for (const config of info.configs) new Config({ ...config, pluginId: this.client.id })
      
        console.log()
        if (Plugin.loaded === 0 && Plugins.plugins === 0) {
          console.log(i18('plugins.devlop'))
        } else if (Plugin.loaded === Plugins.plugins) {
          console.log(i18('plugins.last_plugin', { current: Plugin.loaded + 1, total: Plugins.plugins }))
        }
        console.log()
      
        // Apenas o ultimo iniciará o Discord [Plugin.loaded < Plugins.plugins]
        if (Plugin.loaded < (Plugins.plugins - 1)) {
          Plugin.loaded = Plugin.loaded + 1
          break
        }
            
        if (Plugin.running.length > 0 && Database.client?.isInitialized) {
          Database.client?.destroy()
          console.log(i18('discord.close'))
          Database.client = undefined
        }
      
        if (Database.client === undefined) {
          const database = new Database()
          console.log(i18('database.starting'))
      
          await database.create({
            type: 'mysql',
            host: 'node.seventyhost.net',
            port: 3306,
            username: 'u1692_LdgWCEOTrx',
            password: 'Ie=nbT!9U9zAMHFC8+4Y+CbQ',
            database: 's1692_SeventyHost'
          })
          await database.start()
        }
      
        const client = new Discord()
        if (Discord.client === undefined) {
          client.create()
          await client.start()
        } else {
          console.log(i18('plugins.hasLoaded'))
          await client.register()
        }
      
        break
      }
      
      case 'entries': {
        let { code } = args as Record<string, string>
        const { fileName, dirName } = args as Record<string, string>
        const path = join(cwd(), `entries/${dirName}`)
        let regex: RegExp
      
        if (PKG_MODE) {
          regex = /require\("(?!\.\/)([^"]+)"\)/g
        } else {
          regex = /from "(?!\.\/)([^"]+)"/g
        }
            
        let match
        while ((match = regex.exec(code)) !== null) {
          const content = match[1]
          if (content) {
            const replacedPath = `"${join(__dirname, '../../')}node_modules/${content}"`
            const genRegex = new RegExp(`"${content}"`, 'g')
            code = code.replace(genRegex, replacedPath)
          }
        }
      
        if (!existsSync(path)) await mkdir(path, { recursive: true })
      
        await writeFile(`${path}/${fileName}`, code, { encoding: 'utf-8' })
        const pluginIndex = Plugin.running.findIndex((plugin) => plugin.id === this.client.id)
      
        if (pluginIndex !== -1) {
          Plugin.running[pluginIndex].entries.push(`${path}/${fileName}`)
        } else {
          Plugin.running.push({
            id: this.client.id,
            entries: [`${path}/${fileName}`],
            listen: false,
            metadata: undefined,
            commands: [],
            events: [],
            components: [],
            configs: [],
            crons: []
          })
        }
        this.client.emit(`${fileName}_OK`)
        break
      }
      }
    })
    this.client.on('disconnect', async () => { await this.disconnect() })
    this.client.on('send_me_the_Discord_token_please', async () => {
      const token = credentials.get('token')
      
      if (token === undefined || typeof token !== 'string') throw new Error(i18('discord.token_not_found'))

      console.log(i18('discord.token_send', { isEncrypted: PKG_MODE ? ' ' + i18('crypt.encrypted') : '', pluginId: this.client.id }))
      this.client.emit('discord', PKG_MODE ? (await new Crypt().encrypt(token)) : token)
    })
  }

  async disconnect () {
    const pluginFind = Plugin.running.find((plugin) => plugin?.id === this.client.id)
    Config.all = Config.all.filter((config) => config.pluginId !== this.client.id)
    Command.all = Command.all.filter((command) => command.pluginId !== this.client.id && command.name !== 'config')
    Plugin.running = Plugin.running.filter((plugin) => plugin.id !== this.client.id)

    console.log()
    console.info(i18('plugins.disconnect', { name: pluginFind?.metadata?.name ?? this.client.id }))
    console.log()
  }
}
