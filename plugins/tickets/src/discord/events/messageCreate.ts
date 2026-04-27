import { database } from '@/database'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { Event } from 'discord'
import { MessageFlagsBitField } from 'discord.js'

export default new Event({
  name: 'messageCreate',
  event: 'messageCreate',
  async run(message) {
    if (message.flags.has(MessageFlagsBitField.Flags.Ephemeral) || !message.inGuild()) return
    const { channelId, author, content, id, client } = message
    if (author.id === client.user.id) return
    const ticketData = await database.ticket.findOne({ where: { channelId } })
    if (ticketData === null) return

    const role = author.id === ticketData.ownerId
      ? 'member'
      : ticketData.team?.find((user) => user.id === author.id)?.id !== undefined
        ? 'team'
        : ticketData.users?.find((user) => user.id === author.id)?.id !== undefined
          ? 'guest'
          : 'admin'

    await new TicketBuilder({ interaction: message })
      .setData(ticketData)
      .addHistory({
        user: { id: author.id, name: author.username },
        message: { content, id },
        deleted: false,
        role,
        date: new Date(),
      })
      .edit()
  },
})

