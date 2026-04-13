import { ClaimBuilder } from '@/class/ClaimBuilder.js'
import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { TemplateButtonBuilder } from '@/class/TemplateButtonBuilder.js'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { createDatabase } from '@/utils/database.js'
import type { PluginContext } from 'discord'
import { AuditLogEvent, EmbedBuilder, Message, MessageFlagsBitField } from 'discord.js'

export default function register(ctx: PluginContext): void {
  const database = createDatabase(ctx)

  ctx.event({
    name: 'messageDelete',
    async run(message) {
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

  ctx.event({
    name: 'messageDelete',
    async run(message) {
      if (!message.author?.bot || !(message instanceof Message) || !message.inGuild()) return
      const template = await database.template.findOne({ where: { messageId: message.id } })
      if (template === null) return

      const embed = new TemplateBuilder({ interaction: message }).render(message.embeds[0].toJSON())
      const buttons = new TemplateButtonBuilder().setProperties(template.properties).setSelects(template.selects).setMode('production').render()
      const newMessage = await message.channel.send({ embeds: [embed], components: buttons })
      await database.template.update({ id: template.id }, { messageId: newMessage.id })
    },
  })

  ctx.event({
    name: 'messageDelete',
    async run(message) {
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

  ctx.event({
    name: 'messageDelete',
    async run(message) {
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
}
