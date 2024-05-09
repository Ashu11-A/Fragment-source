import { Discord } from '@/discord/Client'
import { Command, CommandData } from '@/discord/Commands'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, rm, watch, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { isBinaryFile } from 'isbinaryfile'
import { join } from 'path'
import { cwd } from 'process'
import { Socket } from 'socket.io'
import { BaseEntity } from 'typeorm'
import { PKG_MODE, RootPATH } from '..'
import { Database, EntityImport } from './database'

interface Metadata {
  name: string
  version: string
  author: string
  description: string
  license: string
}

interface Plugin {
  metadata: Metadata,
  commands: { name: string, description: string, dmPermission: boolean, type: number }[]
  events: { name: string }[]
  components: { customId: string, cache: string, type: string }[]
  // signature: string
  // date: Date
  // size: string
  // crons: string[]
}

interface PluginsOptions {
  port: string
}

export class Plugins {
  public static all: Record<string, Plugin> = {}
  public static running: Array<{ process: ChildProcessWithoutNullStreams, metadata: Metadata, listen: boolean }> = []
  public static plugins = 0
  public static loaded = 0
  private readonly port: string
  private readonly path = join(RootPATH, 'plugins')

  constructor({ port }: PluginsOptions) {
    this.port = port
  }
  
  async list() {
    if (!existsSync(this.path)) mkdir(this.path)
    const plugins = await glob(`${this.path}/*`)
    const valid = []
    for (const filePath of plugins) {
      if (!(await isBinaryFile(filePath))) continue
      valid.push(filePath)
    }
    Plugins.plugins = valid.length
    return valid
  }

  async start (filePath: string) {
    return await new Promise(async (resolve, reject) => {
      const childInfo = spawn(filePath, ['--info'])
      let info: Metadata | undefined

      childInfo.on('exit', (code, signal) => {
        if (code === 0 && info !== undefined) {
          const process = Plugins.running.find((run) => run.metadata.name === info?.name)

          if (process !== undefined) {
            Plugins.plugins = Plugins.plugins - 1
            console.log(`❌ Plugin ${info?.name} está duplicado!`)
            return resolve(null)
          }

          const child = spawn(filePath, ['--port', this.port])

          console.log(`starting ${info?.name}`)
  
          child.on('error', (err) => { reject(err) })
          child.on('exit', (code, signal) => {
            if (code === 0) resolve(null)
            Plugins.plugins = Plugins.plugins - 1
            return reject(`O binário ${filePath} saiu com código de erro ${code} e sinal ${signal}`)
          })

          child.stderr.on('data', (message) => {
            console.log(message)
          })
  
          child.stdout.once('data', (message) => {
            Plugins.running.push({ process: child, metadata: info as Metadata, listen: false })
  
  
            return resolve(message)
          })
        }
      })

      childInfo.stdout.once('data', (stdout) => info = JSON.parse(stdout) as Metadata)
    })
  }

  async load(): Promise<void> {
    const plugins = await this.list()
    if (plugins.length === 0) {
      console.log('Nenhum plugin encontrado!')
      return
    }

    for await (const filePath of plugins) await this.start(filePath)
  }

  async wather () {
    const watcher = watch(this.path)

    for await (const event of watcher) {
      const filePath = `${this.path}/${event.filename}`

      if (event.eventType !== 'rename') continue
      if (!existsSync(filePath)) continue
      if (!(await isBinaryFile(filePath))) {
        console.log(`Arquivo invalido! ${event.filename} não é um plugin!`)
        continue
      }

      console.log('\n✨ Novo plugin adicionado!')
      await new Promise(resolve => setTimeout(resolve, 2000))
      this.start(filePath)
    }
  }
  
  static async events (socket: Socket, eventName: string, args: any) {
    switch (eventName) {
      case 'info': {
        const info = args as Plugin
        let isBreak = false
        
        for (const [index, process] of Plugins.running.entries()) {
          if (process.metadata.name !== info.metadata.name) continue

          if (process !== undefined && process.listen === true) {
            console.log(`❌ Plugin ${info.metadata.name} está duplicado, enviando pedido de shutdown!`)
            socket.emit('kill')
            isBreak = true
          }
          Plugins.running[index] = {
            ...Plugins.running[index],
            listen: true
          }
        }

        if (isBreak) break

        for (const command of ((info.commands ?? []) as Array<CommandData<boolean>>)) {
          Command.all.set(command.name, command)
        }

        Object.assign(Plugins.all, {
          [socket.id]: {
            ...Plugins.all[socket.id],
            ...info
          }
        })

        console.log(`
✅ Iniciando Plugin ${info.metadata.name}...
  ⚙️ Commands: ${info.commands.length}
  🧩 Components: ${info.components.length}
  🎉 Events: ${info.events.length}
        `)

        if (Plugins.loaded === 0 && Plugins.plugins === 0) {
          console.log('\n🚨 Modo de desenvolvimento\n')
        } else if (Plugins.loaded === Plugins.plugins) {
          console.log(`\n🚩 Último plugin carregado (${Plugins.loaded + 1}/${Plugins.plugins})\n`)
        }

        // Apenas o ultimo iniciará o Discord [Plugins.loaded < Plugins.plugins]
        if (Plugins.loaded < (Plugins.plugins - 1)) {
          Plugins.loaded = Plugins.loaded + 1
          break
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

        const client = new Discord()
        if (Discord?.client === undefined) {
          console.log('📌 Iniciando Discord...')

          client.createClient()
          await client.start()
        } else {
          console.log('⚠️ Atenção: Plugin adicionado após o primeiro registro, talvez seja necessário expulsar o bot, e adicioná-lo novamente ao servidor!')
          await client.register()
        }

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
        console.log(`${sent === 1 ? '\n' : ''}⏳ Carregando entry (${sent}/${total}): ${fileName.split('.')[0]}${sent === total ? '\n' : ''}`)
        if (sent === total) socket.emit('ready')
        break
    }
  }
}