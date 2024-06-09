import { TemplateBuilder } from "@/class/TemplateBuilder.js";
import { Component } from "@/discord/base/index.js";
import { ActionDrawer } from "@/functions/actionDrawer.js";
import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";

new Component({
  customId: 'Save',
  type: "Button",
  async run(interaction) {
    await interaction.deferReply({ ephemeral: true })
    await new TemplateBuilder({ interaction })
      .setMode('production')
      .edit({ messageId: interaction.message.id })

    if (!interaction.replied) await interaction.deleteReply()
  }
})

new Component({
  customId: 'Config',
  type: "Button",
  async run(interaction) {
    await interaction.deferReply({ ephemeral: true })
    await new TemplateBuilder({ interaction })
      .setMode('debug')
      .edit({ messageId: interaction.message.id })

    if (interaction.deferred && !interaction.replied) await interaction.deleteReply()
  }
})

new Component({
  customId: 'DeleteTemplate',
  type: "Button",
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