import { database } from '@/database'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { createEvent } from 'discord'
import { AuditLogEvent, EmbedBuilder, MessageFlagsBitField } from 'discord.js'

export default createEvent({
  name: 'messageDeleteTicketMainMessage',
  event: 'messageDelete',
  async run (message) {
    if (!message.author?.bot || message.flags.has(MessageFlagsBitField.Flags.Ephemeral) || !message.inGuild() || await message.fetch().catch(() => null) !== null) return
    const { id } = message
    const ticketData = await database.ticket.findOne({ where: { messageId: id } })
    if (ticketData === null) return

    const owner = await message.client.users.fetch(ticketData.ownerId).catch(() => null)
    if (owner === null) return

    const builder = new TicketBuilder({ interaction: message }).setData(ticketData).setUser(owner).render()
    const newMessage = await message.channel.send({ embeds: [builder.embed as EmbedBuilder], components: builder.buttons })
    database.ticket.save(Object.assign(ticketData, { messageId: newMessage.id }))

    const auditLog = (await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete })).entries.first()
    await message.channel.send({
      content: auditLog?.executor?.id !== undefined ? `<@${auditLog?.executor?.id}>` : undefined,
      embeds: [new EmbedBuilder({ title: '⚠️ Não é possivel deletar a messagem acima!' }).setColor('Red')]
    }).then(async (msg) => setTimeout(() => { msg.delete() }, 5000))
  },
})
