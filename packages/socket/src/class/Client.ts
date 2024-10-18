import { io, Socket } from 'socket.io-client'
import type { SocketOptions } from '../type/socket'
import { Command, Component, Config, Crons, Discord, Event } from 'discord'
import { glob } from 'glob'
import { basename, join } from 'path'
import { readFile } from 'fs/promises'
import { __plugin_dirname, formatBytes, metadata, PKG_MODE } from 'utils'
import { Crypt } from './Crypt'

export class SocketClient {
  public readonly port: number
  public readonly path: string

  public client: Socket
  static client?: Socket
  static key: string

  constructor({ path, port }: SocketOptions) {
    this.path = path
    this.port = port
    this.client = this.connect()
    SocketClient.client = this.client
  }

  private connect (): Socket {
    console.log(`📡 Esperando conexão na porta ${this.port}...`)
    const socket = io(`ws://localhost:${this.port}/`)
    const commands = Command.all.map((command) => ({ 
      ...command,
      defaultMemberPermissions: undefined
    }))
    socket.on('connect', async () => {
      process.stdout.write('📡 Connected to socket')

      SocketClient.client = socket
      const files = await glob([`${join(__plugin_dirname, 'src', 'entity')}/**/*.{ts,js}`])
    
      for (const entry of files) {
        const FileRun = await import(entry)
    
        if (FileRun?.default === undefined) {
          throw new Error(`Entry ${basename(entry)} not valid! use export default!`)
        }
      }
    
      const info = metadata()
    
      if (files.length > 0) {
        for (const file of files) {
          const fileName = basename(file)
          const code = await readFile(file)
    
          socket.emit('entries', { fileName, dirName: info.name, code: code.toString('utf-8') })
          await new Promise((resolve) => {
            socket.once(`${fileName}_OK`, async () => {
              console.log(`Enviado: ${fileName} (${formatBytes(code.byteLength)})`)
              resolve(null)
            })
          })
        }
        socket.emit('info', {
          metadata: info,
          commands,
          components: Component.all,
          events: Event.all,
          configs: Config.all,
          crons: Crons.all
        })
      }
      socket.emit('send_me_the_Discord_token_please')
    })
    socket.on('kill', () => process.kill(process.pid))
    socket.on('discord', async (token: string) => {
      const client = new Discord()
      const processedKey = PKG_MODE
        ? await new Crypt().decrypt(token)
        : token
      SocketClient.key = processedKey
    
      client.create()
      await client.start()
    
      Event.all.forEach(({ run, name, once }) => (once ?? false)
        ? Discord.client.once(name, run)
        : Discord.client.on(name, run)
      )
    })
    return socket
  }

  disconnection () {
    this.client.disconnect()
  }
}