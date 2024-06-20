import { Discord } from '@/discord/base/Client.js'
import { Command, CommandData } from '@/discord/base/Commands.js'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { watch } from 'chokidar'
import { glob } from 'glob'
import { isBinaryFile } from 'isbinaryfile'
import { basename, dirname, join } from 'path'
import { cwd } from 'process'
import { Socket } from 'socket.io'
import { BaseEntity } from 'typeorm'
import { PKG_MODE, RootPATH } from '@/index.js'
import { Config, ConfigOptions } from './config.js'
import { Database, EntityImport } from './database.js'
import { fileURLToPath } from 'url'
import { createVerify } from 'crypto'
import { i18 } from '@/controller/lang.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cacheWatcher = new Map<string, boolean>()
interface Metadata {
  name: string
  version: string
  author: string
  description: string
  license: string
}

interface Plugin {
  metadata?: Metadata,
  commands: { name: string, description: string, dmPermission: boolean, type: number }[]
  events: { name: string }[]
  components: { customId: string, cache: string, type: string }[]
  configs: ConfigOptions[]
  crons: string[]
  // signature: string
  // date: Date
  // size: string
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
      if (!(await this.validate(filePath))) continue
      valid.push(filePath)
    }
    Plugins.plugins = valid.length
    return valid
  }

  async start (filePath: string) {
    return await new Promise(async (resolve, reject) => {
      const childInfo = spawn(filePath, ['--info'])
      let info: Metadata | undefined

      childInfo.on('exit', (code) => {
        if (code === 0 && info !== undefined) {
          const process = Plugins.running.find((run) => run.metadata?.name === info?.name)

          if (process !== undefined) {
            Plugins.plugins = Plugins.plugins - 1
            console.log(i18('plugins.duplicate', { name: info.name }))
            return resolve(null)
          }

          const child = spawn(filePath, ['--port', this.port])

          console.log(`starting ${info?.name}`)
  
          child.on('error', (err) => { reject(err) })
          child.on('exit', (code, signal) => {
            if (code === 0) resolve(null)
            Plugins.plugins = Plugins.plugins - 1
            cacheWatcher.delete(filePath)
            return reject(i18('plugins.reject', { filePath, code, signal }))
          })

          child.stderr.on('data', (message) => {
            console.log(message)
          })
  
          child.stdout.once('data', (message) => {
            Plugins.running.push({
              metadata: info,
              process: child,
              listen: false,
              components: [],
              commands: [],
              entries: [],
              configs: [],
              events: [],
              crons: []
            })
  
  
            return resolve(message)
          })
        }
      })

      childInfo.stdout.once('data', (stdout) => info = JSON.parse(stdout) as Metadata)
    })
  }

  async validate (filePath: string): Promise<boolean> {
    const binary = await readFile(filePath)
    const publicKey = await readFile(join(__dirname, '../../public_key.pem'), 'utf8')

    const data = binary.subarray(0, binary.length - 512)
    const signature = binary.subarray(binary.length - 512)


    const verifier = createVerify('sha512')
    verifier.update(data)
    verifier.end()

    const isValid = verifier.verify(publicKey, signature)

    if (isValid) {
      console.log(i18('plugins.invalid'))
    } else {
      console.log(i18('plugins.invalid_signature', { fileName: basename(filePath) }))
    }
    return isValid
  }

  async load(): Promise<void> {
    const plugins = await this.list()
    if (plugins.length === 0) {
      console.log(i18('error.no_found', { name: 'plugin' }))
      return
    }

    for await (const filePath of plugins) await this.start(filePath)
  }

  async wather () {
    const watcher = watch(this.path)

    watcher.on('add', async (filePath) => {
      if (!cacheWatcher.get(filePath)) cacheWatcher.set(filePath, true)
      else return
      // Isso é necessario para que os bytes do arquivo movido termine de serem processados pela maquina host
      await new Promise<void>((resolve) => setInterval(resolve, 2000))
      if (!(await isBinaryFile(filePath))) {
        console.log(i18('plugins.invalid_file', { fileName: basename(filePath) }))
        return
      }

      if (!(await this.validate(filePath))) return

      console.log()
      console.log(i18('plugins.new'))
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
          console.log(i18('plugins.duplicate', { name: info.metadata?.name ?? socket.id }))
          socket.emit('kill')
          Plugins.running.splice(index, 1)
          break
        } else {
          Plugins.running[index] = Object.assign(Plugins.running[index], info, { listen: true })
        }
      } else {
        Plugins.running.push(Object.assign(info,
          {
            entries: [],
            id: socket.id,
            listen: true
          }
        ))
      }

      for (const pathFile of Plugins.running[index].entries) {
        const split = pathFile.split('/') // /home/ashu/Documentos/GitHub/PaymentBot-source/core/entries/utils/Config.entry.ts
        const fileName = `${split[split.length - 2]}/${split[split.length - 1]}` // utils/Config.entry.ts
        const entry = await import(pathFile) as EntityImport<typeof BaseEntity>

        Object.assign(Database.entries, ({ [fileName]: entry }))
        console.log(i18('plugins.entry_load', { name: fileName.split('.')[0] }))
      }

      for (const command of ((info.commands ?? []) as Array<CommandData<boolean>>)) {
        Command.all.set(command.name, Object.assign(command, { pluginId: socket.id }))
      }
      console.log()
      console.log(i18('plugins.starting', { name: info.metadata?.name }))
      console.log('  ', i18('plugins.commands', { length: info.commands.length }))
      console.log('  ', i18('plugins.components', { length: info.components.length }))
      console.log('  ', i18('plugins.events', { length: info.events.length }))
      console.log('  ', i18('plugins.configs', { length: info.configs.length }))
      console.log('  ', i18('plugins.crons', { length: info.crons.length }))

      for (const config of info.configs) new Config({ ...config, pluginId: socket.id })

      console.log()
      if (Plugins.loaded === 0 && Plugins.plugins === 0) {
        console.log(i18('plugins.devlop'))
      } else if (Plugins.loaded === Plugins.plugins) {
        console.log(i18('plugins.last_plugin', { current: Plugins.loaded + 1, total: Plugins.plugins }))
      }
      console.log()

      // Apenas o ultimo iniciará o Discord [Plugins.loaded < Plugins.plugins]
      if (Plugins.loaded < (Plugins.plugins - 1)) {
        Plugins.loaded = Plugins.loaded + 1
        break
      }
      
      if (Plugins.running.length > 0 && Database.client?.isInitialized) {
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
          username: 'u1692_A71YtsRYy2',
          password: 't2y9gseoHzo+mm!VX=bva9Gt',
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
          const replacedPath = `"${join(__dirname, '../../')}node_modules/${content}"`;
          const genRegex = new RegExp(`"${content}"`, 'g')
          code = code.replace(genRegex, replacedPath);
        }
      }

      if (!existsSync(path)) await mkdir(path, { recursive: true })

      await writeFile(`${path}/${fileName}`, code, { encoding: 'utf-8' })
      const pluginIndex = Plugins.running.findIndex((plugin) => plugin.id === socket.id)
      if (pluginIndex !== -1) {
        Plugins.running[pluginIndex].entries.push(`${path}/${fileName}`)
      } else {
        Plugins.running.push({
          id: socket.id,
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
      socket.emit(`${fileName}_OK`)
      break
    }
  }
}