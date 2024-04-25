import { db } from '@/app'
import { Event } from '@/discord/base'
import { type Ticket, type History } from '@/interfaces/Ticket'

new Event({
  name: 'messageCreate',
  async run ({ channelId, guildId, content, author, createdAt, id }) {
    const ticket = await db.tickets.get(`${guildId}.tickets.${channelId}`) as undefined | Ticket

    if (ticket === undefined) return
    if (content === '') return

    const role = author.id === ticket.owner
      ? 'member'
      : ticket.team?.find((user) => user.id === author.id)?.id !== undefined
        ? 'team'
        : ticket.users?.find((user) => user.id === author.id)?.id !== undefined
          ? 'guest'
          : 'undefined'

    await db.tickets.push(`${guildId}.tickets.${channelId}.history`, {
      role,
      message: {
        id,
        content
      },
      date: createdAt,
      deleted: false,
      user: { id: author.id, name: author.username }
    } satisfies History)
  }
})
