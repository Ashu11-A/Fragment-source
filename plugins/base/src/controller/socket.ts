import { io, Socket } from 'socket.io-client'
import { Emit } from './emit'
import { DiscordClient } from '@/discord/Client'
import { DiscordEvent } from '@/discord/Event'

export class SocketClient {
    public static key: string
    public static client: Socket
    constructor() {}

    connect (port: string) {
        const socket = io(`ws://localhost:${port}/`)
        socket.on('connect', async () => {
            SocketClient.client = socket
            const emit = new Emit()
            await emit.ready()
            emit.commands()
            emit.components()
            emit.events()
        })
        socket.once('token', async (key: string) => {
            const discordClient = new DiscordClient()
            SocketClient.key = key

            discordClient.createClient()
            await discordClient.start()
            
            DiscordEvent.all.forEach(({ run, name, once }) => (once ?? false)
            ? DiscordClient.client.once(name, run)
            : DiscordClient.client.on(name, run)
          )
        })
    }

    disconnection () {
        SocketClient.client.disconnect()
    }
}