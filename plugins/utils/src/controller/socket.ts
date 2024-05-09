import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { basename, join } from 'path'
import { io, type Socket } from 'socket.io-client'
import { metadata } from '..'
import { Command, Component, Discord, Event } from '@/discord/base'

export class SocketClient {
  public static key: string
  public static client: Socket
  constructor () {}

  connect (port: string) {
    console.log(`📡 Esperando conexão na porta ${port}...`)
    const socket = io(`ws://localhost:${port}/`)
    socket.on('connect', async () => {
      SocketClient.client = socket
      const files = await glob([`${join(__dirname, '..', 'entity')}/**/*.{ts,js}`])
      let sent = 0

      if (files.length === 0) {
        const commands = Command.all.map((command) => ({ 
          ...command,
          defaultMemberPermissions: undefined
         }))

        socket.emit('info', {
          metadata: await metadata(),
          commands,
          components: Component.all,
          events: Event.all,
        })
      } else {
        for (const file of (files)) {
          const fileName = basename(file)
          sent++
          SocketClient.client.emit('entries', { total: files.length, sent, fileName, code: await readFile(file, { encoding: 'utf-8' }) })
        }
      }

    })
    socket.on('ready', async () => {
      socket.emit('info', {
        metadata: await metadata(),
        commands: Command.all,
        components: Component.all,
        events: Event.all,
      })
    })
    socket.on('kill', () => {
      process.kill(process.pid)
    })
    socket.once('discord', async (key: string) => {
      const client = new Discord()
      SocketClient.key = key

      client.create()
      await client.start()

      Event.all.forEach(({ run, name, once }) => (once ?? false)
        ? Discord.client.once(name, run)
        : Discord.client.on(name, run)
      )
    })
  }

  disconnection () {
    SocketClient.client.disconnect()
  }
}
