import { Socket } from "socket.io"
import { env } from ".."
import { Plugins } from "./plugins"
import { Discord } from "@/discord/Client"
import { CommandData, DiscordCommand } from "@/discord/Commands"

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
        this.options.client.onAny(async (eventName, args) => {
            switch (eventName) {
                case 'metadata': {
                    // apenas o ultimo iniciará o Discord [Plugins.loaded < Plugins.plugins]
                    if (Plugins.loaded < (Plugins.plugins - 1)) {
                        Plugins.loaded = Plugins.loaded + 1
                        break
                    }
                    console.log(`✅ Plugin ${args.name} inicializado com sucesso!`)
                    if (Plugins.loaded === 0 && Plugins.plugins === 0) {
                        console.log('\n🚨 Modo de desenvolvimento, iniciando Discord...\n')
                    } else {
                        console.log(`\n🚩 Último plugin carregado (${Plugins.loaded + 1}/${Plugins.plugins}), iniciando Discord...\n`)
                    }
                    const client = new Discord()
                    client.createClient()
                    await client.start()
                    break
                }
                case 'commands': {
                    console.log(`√ Registrando ${eventName}, ${args.length} ${args.length === 1 ? 'elemento' : 'elementos'}`)
                    if (args.length === 0) break
                    for (const command of (args as Array<CommandData<boolean>>)) {
                        DiscordCommand.all.set(command.name, command)
                    }
                    break
                }
                case 'components': console.log(`√ Registrando ${eventName}, ${args.length} ${args.length === 1 ? 'elemento' : 'elementos'}`); break
                case 'events': console.log(`√ Registrando ${eventName}, ${args.length} ${args.length === 1 ? 'elemento' : 'elementos'}`); break
            }
        })
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