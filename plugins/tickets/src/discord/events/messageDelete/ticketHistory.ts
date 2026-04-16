import { database } from '@/database'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { createEvent } from 'discord'
import { Message, MessageFlagsBitField } from 'discord.js'

export default createEvent({
  name: 'messageDeleteTicketHistory',
  event: 'messageDelete',
  async run (message) {
    if (!(message instanceof Message) || !message.inGuild() || message.author?.bot || message.flags.has(MessageFlagsBitField.Flags.Ephemeral)) return
    const { channelId, id } = message
    const ticketData = await database.ticket.findOne({ where: { channelId } })
    if (ticketData === null) return

    const messageIndex = (ticketData?.history ?? []).findIndex((content) => content.message.id === id)
    if (messageIndex === -1) return

    ticketData.history[messageIndex] = { ...ticketData.history[messageIndex], deleted: true }
    await new TicketBuilder({ interaction: message }).setData(ticketData).edit()
    console.info(`⚠️ Uma mensagem foi apagada! ticketId: ${ticketData.id}`)
  },
})
