import { Command } from '@/discord/base/index.js'
import { ApplicationCommandType, EmbedBuilder, codeBlock } from 'discord.js'

new Command({
  name: 'ping',
  description: '[ 🪄 Utilidades ] Mostra o ping do bot',
  dmPermission: false,
  type: ApplicationCommandType.ChatInput,
  async run (interaction) {
    const { client } = interaction
    const apiLatency = client.ws.ping
    const botLatency = Date.now() - interaction.createdTimestamp

    await interaction.reply({
      embeds: [
        new EmbedBuilder({
          title: 'Pong!',
          fields: [
            { name: '⚡ API', value: codeBlock(`${apiLatency}ms`)},
            { name: '🤖 Bot', value: codeBlock(`${botLatency}ms`)}
          ]
      }).setColor('DarkGold')]
    })
  }
})
