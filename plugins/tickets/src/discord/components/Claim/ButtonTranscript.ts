import { Ticket } from '@/class/Ticket.js'
import { Component } from '@/discord/base/Components.js'

new Component({
  customId: 'Transcript',
  type: 'Button',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ ephemeral: true })
    await new Ticket({ interaction }).transcript({ messageId: interaction.message.id })
  }
})