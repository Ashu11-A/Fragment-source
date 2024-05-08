import { Discord } from '@/discord/Client'
import { DiscordEvent } from '@/discord/Event'
import { io, type Socket } from 'socket.io-client'
import { Emit } from './emit'

export class SocketClient {
  public static key: string
  public static client: Socket
  constructor () {}

  connect (port: string) {
    const emit = new Emit()
    console.log(`📡 Esperando conexão na porta ${port}...`)
    const socket = io(`ws://localhost:${port}/`)
    socket.on('connect', async () => {
      SocketClient.client = socket
      emit.commands()
      emit.components()
      emit.events()
      await emit.entries()
    })
    socket.on('ready', async () => await emit.ready())
    socket.once('discord', async (key: string) => {
      const client = new Discord()
      SocketClient.key = key

      client.create()
      await client.start()

      DiscordEvent.all.forEach(({ run, name, once }) => (once ?? false)
        ? Discord.client.once(name, run)
        : Discord.client.on(name, run)
      )
    })
  }

  disconnection () {
    SocketClient.client.disconnect()
  }
}
