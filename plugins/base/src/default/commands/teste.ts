import { DiscordCommand } from "@/discord";
import { ApplicationCommandType } from "discord.js";

new DiscordCommand({
    name: 'test',
    description: 'Apenas um teste',
    dmPermission: false,
    type: ApplicationCommandType.ChatInput,
    async run(interaction) {
        await interaction.reply({
            content: 'Apenas um test'
        })   
    }
})