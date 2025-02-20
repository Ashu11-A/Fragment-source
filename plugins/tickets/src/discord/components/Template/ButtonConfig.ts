import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { Component } from 'discord'
import { MessageFlags } from 'discord.js'

new Component({
  customId: 'Config',
  type: 'Button',
  async run(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await new TemplateBuilder({ interaction })
      .setMode('debug')
      .edit({ messageId: interaction.message.id })

    if (interaction.deferred && !interaction.replied) await interaction.deleteReply()
  }
})