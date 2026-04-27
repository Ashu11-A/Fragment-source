import { database } from '@/database'
import { ClaimBuilder } from '@/class/ClaimBuilder.js'
import { TemplateManager } from '@/class/TemplateManager.js'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { Event } from 'discord'
import { AuditLogEvent, EmbedBuilder, Guild, Message, MessageFlagsBitField, type TextBasedChannel } from 'discord.js'

async function sendDeletionWarning(channel: TextBasedChannel, guild: Guild): Promise<void> {
  const auditLog = (await guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete })).entries.first()
  const warning = await channel.send({
    content: auditLog?.executor?.id !== undefined ? `<@${auditLog.executor.id}>` : undefined,
    embeds: [new EmbedBuilder({ title: '⚠️ Não é possivel deletar a messagem acima!' }).setColor('Red')]
  })
  setTimeout(() => warning.delete(), 5000)
}

export default new Event({
  name: 'messageDelete',
  event: 'messageDelete',
  async run(message) {
    if (!message.inGuild()) return
    if (message.flags.has(MessageFlagsBitField.Flags.Ephemeral)) return

    const { id } = message
    const isBot = message.author?.bot === true

    // Mensagem de usuário deletada em canal de ticket → marca como deletada no histórico
    if (!isBot) {
      if (!(message instanceof Message)) return
      const ticketData = await database.ticket.findOne({ where: { channelId: message.channelId } })
      if (ticketData === null) return
      const historyIndex = (ticketData.history ?? []).findIndex((entry) => entry.message.id === id)
      if (historyIndex === -1) return
      ticketData.history[historyIndex] = { ...ticketData.history[historyIndex], deleted: true }
      await new TicketBuilder({ interaction: message }).setData(ticketData).edit()
      return
    }

    // Mensagem de claim deletada → reenviar
    const claimData = await database.claim.findOne({ where: { messageId: id }, relations: { ticket: true } })
    if (claimData !== null && claimData.ticket?.id !== undefined) {
      const builder = await new ClaimBuilder({ interaction: message }).setTicketId(claimData.ticket.id).render()
      const newMessage = await message.channel.send({ embeds: [builder.embed as EmbedBuilder], components: builder.buttons })
      await database.claim.save(Object.assign(claimData, { messageId: newMessage.id }))
      await sendDeletionWarning(message.channel as TextBasedChannel, message.guild as Guild)
      return
    }

    // Mensagem principal do ticket deletada → reenviar
    if (await message.fetch().catch(() => null) === null) {
      const ticketData = await database.ticket.findOne({ where: { messageId: id } })
      if (ticketData !== null) {
        const owner = await message.client.users.fetch(ticketData.ownerId).catch(() => null)
        if (owner !== null) {
          const builder = new TicketBuilder({ interaction: message }).setData(ticketData).setUser(owner).render()
          const newMessage = await message.channel.send({ embeds: [builder.embed as EmbedBuilder], components: builder.buttons })
          await database.ticket.save(Object.assign(ticketData, { messageId: newMessage.id }))
          await sendDeletionWarning(message.channel as TextBasedChannel, message.guild as Guild)
          return
        }
      }
    }

    // Mensagem de template deletada → reenviar
    if (!(message instanceof Message)) return
    const template = await database.template.findOne({ where: { messageId: id } })
    if (template === null) return
    const manager = new TemplateManager({ interaction: message, template }).setMode('production')
    const embed = manager.renderEmbed(message.embeds[0].toJSON())
    const components = manager.renderComponents()
    const newMessage = await message.channel.send({ embeds: [embed], components })
    await database.template.update({ id: template.id }, { messageId: newMessage.id })
  },
})
