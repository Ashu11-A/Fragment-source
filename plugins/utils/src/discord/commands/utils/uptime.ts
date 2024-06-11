import { Command } from '@/discord/base/index.js'
import { ApplicationCommandType, EmbedBuilder } from 'discord.js'

new Command({
  name: 'uptime',
  description: '[ 🪄 Utilidades ] Mostra o tempo de execução do bot',
  dmPermission: false,
  type: ApplicationCommandType.ChatInput,
  async run (interaction) {
    const embed = new EmbedBuilder({
      title: '⌛ | Uptime do Bot!',
      fields: [
        {
          name: 'Tempo Ativo:',
          value: `<t:${~~((Date.now() - interaction.client.uptime) / 1000)}> (<t:${~~((Date.now() - interaction.client.uptime) / 1000)}:R>)`
        }
      ]
    }).setColor('Green')
    await interaction.reply({ embeds: [embed] })
  }
})
