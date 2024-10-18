import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { Component } from '@/discord/base/index.js'

new Component({
  customId: 'Config',
  type: 'Button',
  async run(interaction) {
    await interaction.deferReply({ ephemeral: true })
    await new TemplateBuilder({ interaction })
      .setMode('debug')
      .edit({ messageId: interaction.message.id })

    if (interaction.deferred && !interaction.replied) await interaction.deleteReply()
  }
})