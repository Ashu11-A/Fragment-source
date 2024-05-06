import { Socket } from "socket.io"
import { env } from ".."
import { Plugins } from "./plugins"
import { DiscordClient } from "@/discord/Client"

interface EventOptions {
    client: Socket
}

export class Event {
    private readonly options
    constructor(options: EventOptions) {
        this.options = options
    }

    async controller () {
        this.options.client.on('disconnect', () => this.disconnect())
        this.options.client.onAny((eventName, args) => {
            switch (eventName) {
                case 'metadata': console.log(`Plugin Conectado: ${args.name}`);break
                case 'commands': console.log(`√ Registrando ${eventName}, ${args.length} ${args.length === 1 ? 'elemento' : 'elementos'}`); break
                case 'components': console.log(`√ Registrando ${eventName}, ${args.length} ${args.length === 1 ? 'elemento' : 'elementos'}`); break
                case 'events': console.log(`√ Registrando ${eventName}, ${args.length} ${args.length === 1 ? 'elemento' : 'elementos'}`); break
            }
        })
    }

    async last () {
        if (Plugins.loaded < Plugins.plugins) {
            Plugins.loaded = Plugins.loaded + 1
            return
        }
        const client = new DiscordClient()
        client.createClient()
        await client.start()
    }

    async connected () {
        const { client } = this.options
        client.emit('token', env?.BOT_TOKEN)
    }

    async disconnect () {
        const { client } = this.options
        console.info(`Plugin Desconectado: ${client.id}`)
    }
}