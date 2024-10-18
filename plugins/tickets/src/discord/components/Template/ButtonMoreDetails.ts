import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { Component } from 'discord'
import { EmbedBuilder } from 'discord.js'

new Component({
  customId: 'MoreDetails',
  type: 'Button',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ ephemeral: true })

    await new TemplateBuilder({ interaction })
      .switchData('MoreDetails')
      .setMode('debug')
      .edit({ messageId: interaction.message.id })

    await interaction.editReply({
      embeds: [
        new EmbedBuilder({
          title: 'Sobre:',
          description: 'A opção `Mais Detalhes`, fará com que um modal seja mostrado para melhor detalhamento do problema.'
        }).setColor('Orange')
      ]
    })

    setTimeout(() => interaction.deleteReply(), 10000)
  },
})