import { Command, Component, Config, Crons, Discord, Event } from 'discord'
import { io, Socket } from 'socket.io-client'
import { metadata, PKG_MODE } from 'utils'
import type { SocketOptions } from '../type/socket'
import { Crypt } from './Crypt'
import { Plugins } from './Plugins'

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
      const files = Object.entries(Plugins.getPlugins())
      const info = metadata()

      SocketClient.client = socket
    
      if (files.length > 0) {
        for (const [fileName, code] of files) {
          socket.emit('entries', { fileName, dirName: info.name, code: code })
          await new Promise((resolve) => {
            socket.once(`${fileName}_OK`, async () => {
              console.log(`Enviado: ${fileName}`)
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