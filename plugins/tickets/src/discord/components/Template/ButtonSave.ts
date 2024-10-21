import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { Component } from 'discord'

new Component({
  customId: 'Save',
  type: 'Button',
  async run(interaction) {
    await interaction.deferReply({ ephemeral: true })
    await new TemplateBuilder({ interaction })
      .setMode('production')
      .edit({ messageId: interaction.message.id })

    if (!interaction.replied) await interaction.deleteReply()
  }
})