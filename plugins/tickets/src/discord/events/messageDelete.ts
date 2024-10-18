import { ClaimBuilder } from '@/class/ClaimBuilder.js'
import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { TemplateButtonBuilder } from '@/class/TemplateButtonBuilder.js'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { Database } from '@/controller/database.js'
import Claim from '@/entity/Claim.entry.js'
import Ticket from '@/entity/Ticket.entry.js'
import { templateDB } from '@/functions/database.js'
import { AuditLogEvent, EmbedBuilder, Message, MessageFlagsBitField } from 'discord.js'
import { Event } from '../base/Event.js'

const ticket = new Database<Ticket>({ table: 'Ticket' })
const claim = new Database<Claim>({ table: 'Claim' })

/**
 * Quando uma mensagem for apagada dentro de um ticket.
 */
new Event({
  name: 'messageDelete',
  async run(message) {
    if (!(message instanceof Message) || !message.inGuild() || message.author?.bot || message.flags.has(MessageFlagsBitField.Flags.Ephemeral)) return
    const { channelId, id } = message
    const ticketData = await ticket.findOne({ where: { channelId } })
    if (ticketData === null) return
  
    const messageIndex = (ticketData?.history ?? []).findIndex((content) => content.message.id === id)
    if (messageIndex === -1) return
  
    ticketData.history[messageIndex] = {
      ...ticketData.history[messageIndex],
      deleted: true
    }
  
    const builder = new TicketBuilder({ interaction: message })
    await builder.setData(ticketData).edit()
    console.info(`⚠️ Uma mensagem foi apagada! ticketId: ${ticketData.id}`)
  },
})

/**
 *  Se o Template for apagado (Recrie-o)
 */
new Event({
  name: 'messageDelete',
  async run(message) {
    if (!message.author?.bot || !(message instanceof Message) || !message.inGuild()) return
    const template = await templateDB.findOne({ where: { messageId: message.id } })
    if (template === null) return

    const embed = new TemplateBuilder({ interaction: message })
      .render(message.embeds[0].toJSON())
    const buttons = new TemplateButtonBuilder()
      .setProperties(template.properties)
      .setSelects(template.selects)
      .setMode('production')
      .render()

    const newMessage = await message.channel.send({ embeds: [embed], components: buttons })

    await templateDB.update({ id: template.id }, { messageId: newMessage.id })
  },
})

/**
 * Se a mensagem inicial do ticket for apagada (isso irá recriar ela).
 */
new Event({
  name: 'messageDelete',
  async run(message) {
    if (!message.author?.bot || message.flags.has(MessageFlagsBitField.Flags.Ephemeral) || !message.inGuild() || await message.fetch().catch(() => null) !== null) return
    const { id } = message
    const ticketData = await ticket.findOne({ where: { messageId: id } })
    if (ticketData === null) return
  
    const owner = await message.client.users.fetch(ticketData.ownerId).catch(() => null)
    if (owner === null) return
  
    const builder = new TicketBuilder({ interaction: message }).setData(ticketData).setUser(owner).render()
    const nemMessage = await message.channel.send({ 
      embeds: [builder.embed as EmbedBuilder],
      components: builder.buttons
    })
  
    ticket.save(Object.assign(ticketData, { messageId: nemMessage.id }))
  
    const auditLog = (await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete })).entries.first()
    await message.channel.send({
      content: auditLog?.executor?.id !== undefined ? `<@${auditLog?.executor?.id}>` : undefined,
      embeds: [new EmbedBuilder({
        title: '⚠️ Não é possivel deletar a messagem acima!',
      }).setColor('Red')]
    })
      .then(async (msg) => setTimeout(() => { msg.delete() }, 5000))
  }
})

/**
 * Se a mensagem de claim for apagada (isso irá recriar ela).
 */
new Event({
  name: 'messageDelete',
  async run(message) {
    if (!message.author?.bot || message.flags.has(MessageFlagsBitField.Flags.Ephemeral) || !message.inGuild()) return
    const { id } = message
    const claimData = await claim.findOne({ where: { messageId: id }, relations: { ticket: true } })
    if (claimData === null || claimData?.ticket?.id === undefined) return

    const builder = await new ClaimBuilder({ interaction: message }).setTicketId(claimData.ticket.id).render()
    if (builder === undefined) return

    const nemMessage = await message.channel.send({
      embeds: [builder.embed as EmbedBuilder],
      components: builder.buttons
    })

    await claim.save(Object.assign(claimData, { messageId: nemMessage.id }))

    const auditLog = (await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete })).entries.first()
    await message.channel.send({
      content: auditLog?.executor?.id !== undefined ? `<@${auditLog?.executor?.id}>` : undefined,
      embeds: [new EmbedBuilder({
        title: '⚠️ Não é possivel deletar a messagem acima!',
      }).setColor('Red')]
    })
      .then(async (msg) => setTimeout(() => { msg.delete() }, 5000))
  },
})