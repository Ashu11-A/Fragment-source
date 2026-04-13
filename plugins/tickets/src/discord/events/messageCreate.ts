import { TicketBuilder } from '@/class/TicketBuilder.js'
import { createDatabase } from '@/utils/database'
import type { PluginContext } from 'discord'
import { MessageFlagsBitField } from 'discord.js'

export default function register(ctx: PluginContext): void {
  const database = createDatabase(ctx)

  ctx.event({
    name: 'messageCreate',
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
      console.log(`💬 Nova mensagem salva! TicketId: ${ticketData.id}`)
    },
  })
}
