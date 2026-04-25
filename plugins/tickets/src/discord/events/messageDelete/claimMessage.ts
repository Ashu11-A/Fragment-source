import { database } from '@/database'
import { ClaimBuilder } from '@/class/ClaimBuilder.js'
import { Event } from 'discord'
import { AuditLogEvent, EmbedBuilder, MessageFlagsBitField } from 'discord.js'

export default new Event({
  name: 'messageDeleteClaimMessage',
  event: 'messageDelete',
  async run (message) {
    if (!message.author?.bot || message.flags.has(MessageFlagsBitField.Flags.Ephemeral) || !message.inGuild()) return
    const { id } = message
    const claimData = await database.claim.findOne({ where: { messageId: id }, relations: { ticket: true } })
    if (claimData === null || claimData?.ticket?.id === undefined) return

    const builder = await new ClaimBuilder({ interaction: message }).setTicketId(claimData.ticket.id).render()
    if (builder === undefined) return

    const newMessage = await message.channel.send({ embeds: [builder.embed as EmbedBuilder], components: builder.buttons })
    await database.claim.save(Object.assign(claimData, { messageId: newMessage.id }))

    const auditLog = (await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete })).entries.first()
    await message.channel.send({
      content: auditLog?.executor?.id !== undefined ? `<@${auditLog?.executor?.id}>` : undefined,
      embeds: [new EmbedBuilder({ title: '⚠️ Não é possivel deletar a messagem acima!' }).setColor('Red')]
    }).then(async (msg) => setTimeout(() => { msg.delete() }, 5000))
  },
})
