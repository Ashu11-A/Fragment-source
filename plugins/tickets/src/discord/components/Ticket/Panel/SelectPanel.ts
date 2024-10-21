import { Ticket } from '@/class/Ticket.js'
import { TicketPanel } from '@/class/TicketPanel.js'
import { Component } from 'discord'

new Component({
  customId: 'PanelSelect',
  type: 'StringSelect',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ ephemeral: true })
    const { values, channelId } = interaction
    const builder = new TicketPanel({ interaction })
    const ticket = new Ticket({ interaction })
    
    switch (values[0]) {
    case 'CreateCall': { await builder.CreateCall(); break }
    case 'AddUser': { await builder.AddUser(); break }
    case 'RemoveUser': { await builder.RemoveUser(); break }
    case 'Transcript': { await ticket.transcript({ channelId }); break }
    case 'Delete': { await ticket.delete({ channelId }); break }
    }
  }
})