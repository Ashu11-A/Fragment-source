import { Discord } from '@/discord/Client'
import { Command, CommandData } from '@/discord/Commands'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { watch } from 'chokidar'
import { glob } from 'glob'
import { isBinaryFile } from 'isbinaryfile'
import { join } from 'path'
import { cwd } from 'process'
import { Socket } from 'socket.io'
import { BaseEntity } from 'typeorm'
import { PKG_MODE, RootPATH } from '..'
import { Config, ConfigOptions } from './config'
import { Database, EntityImport } from './database'

interface Metadata {
  name: string
  version: string
  author: string
  description: string
  license: string
}

interface Plugin {
  metadata?: Metadata,
  commands?: { name: string, description: string, dmPermission: boolean, type: number }[]
  events?: { name: string }[]
  components?: { customId: string, cache: string, type: string }[]
  configs?: ConfigOptions[]
  // signature: string
  // date: Date
  // size: string
  // crons: string[]
}

interface PluginsOptions {
  port: string
}

interface PluginRunning extends Plugin {
  id?: string
  process?: ChildProcessWithoutNullStreams
  entries: string[]
  listen: boolean
}

export class Plugins {
  public static running: PluginRunning[] = []
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
          const process = Plugins.running.find((run) => run.metadata?.name === info?.name)

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
            Plugins.running.push({ process: child, metadata: info as Metadata, entries: [], listen: false })
  
  
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

    watcher.on('add', async (filePath) => {
      // Isso é necessario para que os bytes do arquivo movido termine de serem processados pela maquina host
      await new Promise<void>((resolve) => setInterval(resolve, 2000))
      if (!(await isBinaryFile(filePath))) {
        console.log(`Arquivo invalido! ${filePath} não é um plugin!`)
        return
      }

      console.log('\n✨ Novo plugin adicionado!')
      this.start(filePath)
    })
  }
  
  static async events (socket: Socket, eventName: string, args: any) {
    switch (eventName) {
    case 'info': {
      const info = args as Plugin

      const index = Plugins.running.findIndex((plugin) => plugin.id === socket.id)
      const process = Plugins.running[index]

      if (index !== -1) {
        if (process?.listen === true) {
          console.log(`❌ Plugin ${info.metadata?.name} está duplicado, enviando pedido de shutdown!`)
          socket.emit('kill')
          Plugins.running.splice(index, 1)
          break
        } else {
          Plugins.running[index] = {
            ...Plugins.running[index],
            ...info,
            listen: true
          }
        }
      } else {
        Plugins.running.push({
          ...info,
          entries: [],
          id: socket.id,
          listen: true
        })
      }

      for (const pathFile of Plugins.running[index].entries) {
        const split = pathFile.split('/') // /home/ashu/Documentos/GitHub/PaymentBot-source/core/entries/utils/Config.entry.ts
        const fileName = `${split[split.length - 2]}/${split[split.length - 1]}` // utils/Config.entry.ts
        const entry = await import(pathFile) as EntityImport<typeof BaseEntity>

        Object.assign(Database.entries, ({ [fileName]: entry }))
        console.log(`⏳ Carregando entry: ${fileName.split('.')[0]}`)
      }

      for (const command of ((info.commands ?? []) as Array<CommandData<boolean>>)) {
        console.log(command.name, socket.id, )
        Command.all.set(command.name, { ...command, pluginId: socket.id })
      }

      console.log(`
✅ Iniciando Plugin ${info.metadata?.name}...
  🤖 Commands: ${info.commands?.length}
  🧩 Components: ${info.components?.length}
  🎉 Events: ${info.events?.length}
  ⚙️  Configs: ${info.configs?.length}
        `)

      for (const config of (info?.configs ?? [])) new Config({ ...config, pluginId: socket.id })

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
      
      if (Plugins.running.length > 0) {
        Database.client?.destroy()
        Database.client = undefined
      }

      if (Database.client === undefined) {
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
        client.createClient()
        await client.start()
      } else {
        console.log('⚠️ Atenção: Plugin adicionado após o primeiro registro, talvez seja necessário expulsar o bot, e adicioná-lo novamente ao servidor!')
        await client.register()
      }

      break
    }

    case 'entries':
      let { code, fileName, dirName } = args as { fileName: string, code: string, dirName: string }
      const path = join(cwd(), `entries/${dirName}`)
      let regex: RegExp

      if (PKG_MODE) {
          regex = /require\("(?!\.\/)([^"]+)"\)/g
      } else {
          regex = /from "(?!\.\/)([^"]+)"/g
      }
      
      let match;
      while ((match = regex.exec(code)) !== null) {
          const content = match[1];
          if (content) {
              console.log(`🔄 Convertendo ${fileName}`);
              const replacedPath = `${join(__dirname, '../../')}node_modules/${content}`;
              code = code.replace(new RegExp(content, 'g'), replacedPath);
          }
      }

      if (!existsSync(path)) await mkdir(path, { recursive: true })

      await writeFile(`${path}/${fileName}`, code, { encoding: 'utf-8' })
      const pluginIndex = Plugins.running.findIndex((plugin) => plugin.id === socket.id)
      if (pluginIndex !== -1) {
        Plugins.running[pluginIndex].entries.push(`${path}/${fileName}`)
      } else {
        Plugins.running.push({ id: socket.id, entries: [`${path}/${fileName}`], listen: false })
      }
      socket.emit(`${fileName}_OK`)
      break
    }
  }
}