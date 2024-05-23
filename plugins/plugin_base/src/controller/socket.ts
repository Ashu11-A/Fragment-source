import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { basename, join } from 'path'
import { io, type Socket } from 'socket.io-client'
import { metadata } from '..'
import { Command, Component, Discord, Event } from '@/discord/base'
import { formatBytes } from '../functions/format'
import { Config } from '@/discord/base/Config'

export class SocketClient {
  public static key: string
  public static client: Socket
  constructor () {}

  connect (port: string) {
    console.log(`📡 Esperando conexão na porta ${port}...`)
    const socket = io(`ws://localhost:${port}/`)
    const commands = Command.all.map((command) => ({ 
      ...command,
      defaultMemberPermissions: undefined
    }))
    socket.on('connect', async () => {
      SocketClient.client = socket
      const files = await glob([`${join(__dirname, '..', 'entity')}/**/*.{ts,js}`])

      for (const entry of files) {
        const FileRun = await import(entry)

        if (FileRun?.default === undefined) {
          throw new Error(`Entry ${basename(entry)} not valid! use export default!`)
        }
      }

      const info = await metadata()

      if (files.length > 0) {
        for (const file of files) {
          const fileName = basename(file)
          const code = await readFile(file)

          SocketClient.client.emit('entries', { fileName, dirName: info.name, code: code.toString('utf-8') })
          await new Promise((resolve) => {
            SocketClient.client.once(`${fileName}_OK`, async () => {
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
          configs: Config.all
        })
      }

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
