import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { Component } from 'discord'
import { ActionDrawer } from 'utils'
import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from 'discord.js'

new Component({
  customId: 'DeleteTemplate',
  type: 'Button',
  async run(interaction) {
    const initialInteraction = await interaction.reply({
      fetchReply: true,
      ephemeral: true,
      embeds: [new EmbedBuilder({ title: 'Deseja realmente apagar esse Template?' })],
      components:  ActionDrawer([
        new ButtonBuilder({
          customId: 'yes',
          emoji: { name: '✔️' },
          style: ButtonStyle.Success
        }),
        new ButtonBuilder({
          customId: 'no',
          emoji: { name: '✖️' },
          style: ButtonStyle.Danger
        })
      ], 2)
    })
    const collector = initialInteraction.createMessageComponentCollector({ componentType: ComponentType.Button })

    collector.on('collect', async subInteraction => {
      collector.stop()

      if (subInteraction.customId === 'yes') {
        await new TemplateBuilder({ interaction: subInteraction }).delete({ messageId: interaction.message.id })
        return
      }
      await subInteraction.update({ embeds: [new EmbedBuilder({ title: 'Ação cancelada!' }).setColor('Green')], components: [] })
    })

    if (!interaction.replied) await interaction.deleteReply()
  }
})