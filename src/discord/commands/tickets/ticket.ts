import { db } from '@/app'
import { Command } from '@/discord/base'
import { TicketButtons } from '@/discord/components/tickets'
import { PanelTicket } from '@/discord/components/tickets/functions/panelTicket'
import { type ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js'

new Command({
  name: 'ticket',
  description: '[ 🎫 Ticket ] Abrir Ticket',
  type: ApplicationCommandType.ChatInput,
  dmPermission,
  options: [
    {
      name: 'add-user',
      description: '[ 🎫 Ticket ] Adiciona um usuário no ticket atual.',
      type: ApplicationCommandOptionType.User,
      required: false
    },
    {
      name: 'remove-user',
      description: '[ 🎫 Ticket ] Remove um usuário do ticket atual.',
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: false
    },
    {
      name: 'create-call',
      description: '[ 🎫 Ticket ] Criar uma call de suporte para o ticket atual',
      type: ApplicationCommandOptionType.Boolean,
      required: false
    },
    {
      name: 'del-ticket',
      description: '[ 🎫 Ticket ] Força o ticket atual a ser apagado.',
      type: ApplicationCommandOptionType.Boolean,
      required: false
    },
    {
      name: 'del-all-tickets',
      description: '[ 🎫 Ticket ] Deleta todos os tickets!',
      type: ApplicationCommandOptionType.Boolean,
      required: false
    }
  ],
  async autoComplete (interaction) {
    const { options, guildId, channelId } = interaction

    const users = await db.tickets.get(`${guildId}.tickets.${channelId}.users`)
    const user = options.getString('remove-user')
    const respond: Array<ApplicationCommandOptionChoiceData<string | number>> = []
    if (user !== null) {
      for (const user of users) {
        console.log(JSON.stringify(user))
        respond.push({ name: `${user.displayName} | ${user.name}`, value: user.id })
      }
    }

    await interaction.respond(respond)
  },
  async run (interaction) {
    const { options } = interaction
    const ticketPanel = new PanelTicket({ interaction })
    const ticketConstructor = new TicketButtons({ interaction })
    const addUser = options.getUser('add-user')
    const remUser = options.getString('remove-user')
    const createCall = options.getBoolean('create-call')
    const delTicket = options.getBoolean('del-ticket')
    const delAllTickets = options.getBoolean('del-all-tickets')

    await interaction.deferReply({ ephemeral: true })

    if (addUser !== null) { await ticketPanel.EditChannelCollector({ userIdByCommand: addUser.id }) }
    if (delTicket === true) { await ticketConstructor.delete({ type: 'delTicket' }) }
    if (createCall === true) { await ticketPanel.CreateCall() }
    if (remUser !== null) { await ticketPanel.EditChannelCollector({ userIdByCommand: remUser, remove: true }) }
    if (remUser !== null || addUser !== null || delTicket !== null || createCall !== null || delAllTickets !== null) return

    await ticketConstructor.createTicket({ title: 'Ticket aberto por meio do comando /ticket' })
  }
})
