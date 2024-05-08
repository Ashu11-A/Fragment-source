import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, rm, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { join } from 'path'
import { cwd } from 'process'
import { isBinaryFile } from 'isbinaryfile'
import { PKG_MODE, RootPATH } from '..'
import { Socket } from 'socket.io'
import { Discord } from '@/discord/Client'
import { Database, EntityImport } from './database'
import { CommandData, DiscordCommand } from '@/discord/Commands'
import { BaseEntity } from 'typeorm'

interface Plugin {
  name: string
  version: string
  author: string
  // signature: string
  // date: Date
  size: string
  commands: string[]
  events: string[]
  components: string[]
  // crons: string[]
}

export class Plugins {
  public static all: Record<string, Plugin> = {}
  public static plugins = 0
  public static loaded = 0

  constructor() {}
  
  async list() {
    if (!existsSync(join(RootPATH, 'plugins'))) mkdir(join(RootPATH, 'plugins'))
    const plugins = await glob(`${join(RootPATH, 'plugins')}/*`)
    const valid = []
    for (const filePath of plugins) {
      if (!(await isBinaryFile(filePath))) continue
      valid.push(filePath)
    }
    Plugins.plugins = valid.length
    return valid
  }

  async load(port: string): Promise<void> {
    const plugins = await this.list()
    if (plugins.length === 0) {
      console.log('Nenhum plugin encontrado!')
      return
    }

    for (const filePath of plugins) {
      await new Promise((resolve, reject) => {
        const child = spawn(filePath, ['--port', port])

        child.on('error', (err) => { reject(err) })
        child.on('exit', (code, signal) => {
          if (code === 0) resolve(null)
          Plugins.plugins = Plugins.plugins - 1
          reject(`O binário ${filePath} saiu com código de erro ${code} e sinal ${signal}`)
        })
        child.stdout.once('data', (message) => {
          resolve(message)
        })
      })
    }
  }
  
  async events (socket: Socket, eventName: string, args: any) {
    switch (eventName) {
      case 'metadata': {
        // Apenas o ultimo iniciará o Discord [Plugins.loaded < Plugins.plugins]
        Object.assign(Plugins.all, {
          [socket.id]: {
            ...args, ...Plugins.all[socket.id]
          }
        })

        if (Plugins.loaded < (Plugins.plugins - 1)) {
          Plugins.loaded = Plugins.loaded + 1
          break
        }
        console.log(`✅ Plugin ${args.name} inicializado com sucesso!`)
        if (Plugins.loaded === 0 && Plugins.plugins === 0) {
          console.log('\n🚨 Modo de desenvolvimento\n')
        } else {
          console.log(`\n🚩 Último plugin carregado (${Plugins.loaded + 1}/${Plugins.plugins})\n`)
        }

        if (Database?.client === undefined) {
          const client = new Database()
          console.log('🗂️ Iniciando Banco de dados...')

          await client.create({
            type: 'mysql',
            host: 'node.seventyhost.net',
            port: 3306,
            username: 'u1692_A71YtsRYy2',
            password: 't2y9gseoHzo+mm!VX=bva9Gt',
            database: 's1692_SeventyHost'
          })
          await client.start()
        }

        if (Discord?.client === undefined) {
          const client = new Discord()
          console.log('📌 Iniciando Discord...')

          client.createClient()
          await client.start()
        }

        break
      }
      case 'commands': {
        Object.assign(Plugins.all, {
          [socket.id]: {
            ...Plugins.all[socket.id],
            commands: (args as Array<CommandData<boolean>>).map((command) => command.name)
          }
        })

        if (args.length === 0) break
        console.log(`\n📍 Registrando commands: ${(args as Array<CommandData<boolean>>).map((command) => command.name).join(' ')}`)
        for (const command of (args as Array<CommandData<boolean>>)) {
          DiscordCommand.all.set(command.name, command)
        }
        break
      }
      case 'components': {
        Object.assign(Plugins.all,{
          [socket.id]: {
            ...Plugins.all[socket.id],
            components: args.map((components: { customId: string }) => components.customId)
          }
        })

        console.log(`📍 Registrando ${eventName}, ${args.length} ${args.length === 1 ? 'elemento' : 'elementos'}`)
        break
      }
      case 'events': {
        Object.assign(Plugins.all, {
          [socket.id]: {
            ...Plugins.all[socket.id],
            events: args.map((events: { name: string }) => events.name)
          }
        })

        console.log(`📍 Registrando ${eventName}, ${args.length} ${args.length === 1 ? 'elemento' : 'elementos'}`)
        break
      }
      case 'entries':
        const { code, fileName, sent, total } = args as { fileName: string, code: string, total: number, sent: number }
        const path = join(cwd(), 'entries')
        const refatored = PKG_MODE
          ? code.replaceAll('require("typeorm")' , `require("${join(__dirname, '../../')}node_modules/typeorm/index")`) 
          : code.replaceAll("from 'typeorm'", `from '${RootPATH}/node_modules/typeorm/index'`)

        if (sent === 1 && existsSync(path)) await rm(path, { recursive: true })
        if (!existsSync(path)) await mkdir(path, { recursive: true })

        await writeFile(`${path}/${fileName}`, refatored, { encoding: 'utf-8' })
        const entry = await import(`${path}/${fileName}`) as EntityImport<typeof BaseEntity>

        Object.assign(Database.entries, ({ [fileName]: entry }))
        console.log(`${sent === 1 && '\n'}⏳ Carregando entry (${sent}/${total}): ${fileName.split('.')[0]}${sent === total && '\n'}`)
        if (sent === total) socket.emit('ready')
        break
    }
  }
}