import { Ticket } from '@/class/Ticket.js'
import { TicketPanel } from '@/class/TicketPanel.js'
import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { MessageFlags } from 'discord.js'

export default createResponder({
  customId: 'PanelSelect',
  types: [ResponderType.StringSelect],
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
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
  },
})

