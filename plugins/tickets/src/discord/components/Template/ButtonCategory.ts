import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { EmbedBuilder } from 'discord.js'

export default createResponder({
  customId: 'Category',
  types: [ResponderType.Button],
  async run(interaction) {
    await interaction.reply({
      ephemeral: true,
      embeds: [new EmbedBuilder({
        title: 'Recurso movido!',
        description: 'Use os comandos:\n`/ticket category add`\n`/ticket category rem`'
      }).setColor('Orange')]
    })
  },
})

