import { Command } from "@/discord/base";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";

new Command({
    name: 'delete',
    description: 'Não use isso! ferramenta de debug!',
    dmPermission: false,
    type: ApplicationCommandType.ChatInput,
    options:[
        {
            name: 'database',
            description: 'Reseta o database',
            type: ApplicationCommandOptionType.Boolean
        },
        {
            name: 'channels',
            description: 'Apaga todos os channels do servidor atual',
            type: ApplicationCommandOptionType.Boolean
        }
    ],
    async run(interaction) {
        const { options, guild } = interaction
        if (guild === null) return
        const database = options.getBoolean('database')
        const channels = options.getBoolean('channels')

        if (channels) {
            for await (const [id, channel] of await guild.channels.fetch()) channel?.delete()
        }
    },
})