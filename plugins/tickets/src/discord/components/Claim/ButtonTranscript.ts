import { Ticket } from '@/class/Ticket.js'
import { Component } from 'discord'
import { MessageFlags } from 'discord.js'

new Component({
  customId: 'Transcript',
  type: 'Button',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return

    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await new Ticket({ interaction }).transcript({ messageId: interaction.message.id })
  }
})