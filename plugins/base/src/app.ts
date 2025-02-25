import 'reflect-metadata'
import './register.js'

import { Cli } from 'cli'
import { Crypt } from 'crypt'
import { Command, Component, Config, Crons, Discord, Event } from 'discord'
import { Entry, SocketClient } from 'socket-client'
import { metadata } from 'utils'

// eslint-disable-next-line no-var
declare var self: Worker

const postMessage = (message: unknown) => {
  const formattedMessage = typeof message === 'object'
    ? JSON.stringify(message)
    : JSON.stringify({ message })
  self.postMessage(formattedMessage)
}

self.onmessage = async (event: MessageEvent) => {
  const receivedArgs = Array.isArray(event.data) ? event.data : []
  if (receivedArgs.length === 0) throw new Error('🛠️ No arguments received.')

  await Crons.register()

  console.log('🛠️ Initializing CLI with received arguments...')

  await new Cli({
    functions: {
      info: () => {
        postMessage({ metadata: metadata() })
      },
      port: async (port) => {
        const parsedPort = parseFloat(String(port))
        console.log(`🔌 Starting SocketClient on port: ${parsedPort}`)

        new SocketClient({ port: parsedPort, path: process.cwd() })

        SocketClient.client.once('connect', async () => {
          postMessage({ websocketId: SocketClient.client.id })
        })

        SocketClient.client.once('register', async () => {
          await new Promise<void>((resolve) => {
            const entries = Entry.getEntries()
            SocketClient.client.emit('entries', entries)

            SocketClient.client.once('entries_ok', () => resolve())
          })

          await new Promise<void>((resolve) => {
            SocketClient.client.emit('discord_metadata', {
              commands: Command.all.map((command) => ({
                ...command,
                defaultMemberPermissions: undefined,
              })),
              components: Component.all,
              events: Event.all,
              configs: Config.all,
              crons: Crons.all,
            })

            SocketClient.client.once('discord_metadata_ok', () => resolve())
          })

          SocketClient.client.on('discord_token', async (token: string) => {
            const client = new Discord()
            const processedToken = await new Crypt().decrypt(token)
  
            await client.start(processedToken)
  
            Event.all.forEach(({ run, name, once }) => {
              if (once) {
                Discord.client.once(name, run)
              } else {
                Discord.client.on(name, run)
              }
            })
          })
  
          SocketClient.client.emit('send_me_the_Discord_token_please')
        })
      },
    },
    argv: receivedArgs.flatMap((record: Record<string, number | boolean>) =>
      Object.entries(record).flatMap(([key, value]) => [key, String(value)])
    ),
  }).exec()
}
