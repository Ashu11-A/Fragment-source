import { TicketBuilder } from "@/class/TicketBuilder.js";
import { console } from "@/controller/console.js";
import { Database } from "@/controller/database.js";
import Ticket from "@/entity/Ticket.entry.js";
import { AuditLogEvent, EmbedBuilder, Message } from "discord.js";
import { Event } from "@/discord/base/index.js";
const ticket = new Database<Ticket>({ table: 'Ticket' })

new Event({
  name: 'messageCreate',
  async run(message) {
    if (!message.inGuild()) return
    const { channelId, author, content, id, client } = message
    if (author.id === client.user.id) return
    const ticketData = await ticket.findOne({ where: { channelId: channelId } })
    if (ticketData === null) return

    const role = author.id === ticketData.ownerId
      ? 'member'
      : ticketData.team?.find((user) => user.id === author.id)?.id !== undefined
        ? 'team'
        : ticketData.users?.find((user) => user.id === author.id)?.id !== undefined
          ? 'guest'
          : 'admin'

    const builder = new TicketBuilder({ interaction: message })
    await builder
      .setData(ticketData)
      .addHistory({
        user: { id: author.id, name: author.username},
        message: { content, id },
        deleted: false,
        role,
        date: new Date()
      })
      .edit()
    console.log(`💬 Nova mensagem salva! TicketId: ${ticketData.id}`)
  },
})

new Event({
  name: 'messageDelete',
  async run(message) {
    if (!(message instanceof Message) || !message.inGuild()) return
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

new Event({
  name: 'messageDelete',
  async run(message) {
    if (!message.inGuild() || await message.fetch().catch(() => null) !== null) return
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