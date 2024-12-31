import 'reflect-metadata'
import './index.js'
import './register.js'

import { Cli } from 'cli'
import { Command, Component, Config, Crons, Discord, Event } from 'discord'
import { Crypt, Entry, SocketClient } from 'socket-client'
import { isPKG, metadata } from 'utils'
import { fileURLToPath } from 'bun'
import { dirname } from 'path'

// eslint-disable-next-line no-var
declare var self: Worker
const path = dirname(fileURLToPath(import.meta.url))

const postMessage = (message: unknown) => {
  const formattedMessage = typeof message === 'object'
    ? JSON.stringify(message)
    : JSON.stringify({ message })
  self.postMessage(formattedMessage)
}

self.onmessage = async (event: MessageEvent) => {
  const receivedArgs = Array.isArray(event.data) ? event.data : []

  if (receivedArgs.length === 0) {
    throw new Error('🛠️ No arguments received.')
  }

  console.log('📩 Received Args:', receivedArgs)

  // Register scheduled tasks
  await Crons.register()

  console.log('🛠️ Initializing CLI with received arguments...')

  new Cli({
    functions: {
      info: () => {
        postMessage({ metadata: metadata() })
      },
      port: (port) => {
        const parsedPort = parseFloat(String(port))
        console.log(`🔌 Starting SocketClient on port: ${parsedPort}`)

        const socket = new SocketClient({ port: parsedPort, path: process.cwd() })

        socket.client.on('connect', async () => {
          const entries = Object.entries(Entry.getEntries())

          if (entries.length > 0) {
            for (const [fileName, code] of entries) {
              socket.client.emit('entries', { fileName, code })
              await new Promise((resolve) => {
                socket.client.once(`${fileName}_OK`, () => {
                  console.log(`Enviado: ${fileName}`)
                  resolve(null)
                })
              })
            }
          }

          socket.client.emit('discord_metadata', {
            commands: Command.all.map((command) => ({
              ...command,
              defaultMemberPermissions: undefined,
            })),
            components: Component.all,
            events: Event.all,
            configs: Config.all,
            crons: Crons.all,
          })

          socket.client.on('discord_token', async (token: string) => {
            const client = new Discord()
            const processedToken = isPKG(path)
              ? await new Crypt().decrypt(token)
              : token

            Discord.token = processedToken

            client.create()
            await client.start()

            Event.all.forEach(({ run, name, once }) => {
              if (once) {
                Discord.client.once(name, run)
              } else {
                Discord.client.on(name, run)
              }
            })
          })

          socket.client.emit('send_me_the_Discord_token_please')
        })

        postMessage(`SocketClient started on port ${parsedPort}`)
      },
    },
    argv: receivedArgs.flatMap((record: Record<string, number | boolean>) =>
      Object.entries(record).flatMap(([key, value]) => [key, String(value)])
    ),
  })
}
