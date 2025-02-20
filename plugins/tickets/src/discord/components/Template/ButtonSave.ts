import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { Component } from 'discord'
import { MessageFlags } from 'discord.js'

new Component({
  customId: 'Save',
  type: 'Button',
  async run(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await new TemplateBuilder({ interaction })
      .setMode('production')
      .edit({ messageId: interaction.message.id })

    if (!interaction.replied) await interaction.deleteReply()
  }
})