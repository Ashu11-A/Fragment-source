import { Command } from '@/discord/base'
import { TicketButtons } from '@/discord/components/tickets'
import { ApplicationCommandType } from 'discord.js'

new Command({
  name: 'ticket',
  description: '[ 🎫 Ticket ] Abrir Ticket',
  type: ApplicationCommandType.ChatInput,
  dmPermission,
  options: [

  ],
  async run (interaction) {
    const ticketConstructor = new TicketButtons({ interaction })

    await interaction.deferReply({ ephemeral: true })
    await ticketConstructor.createTicket({ about: 'Ticket aberto por meio do comando /ticket' })
  }
})
