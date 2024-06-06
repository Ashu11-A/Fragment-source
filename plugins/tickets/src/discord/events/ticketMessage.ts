import Ticket from "@/entity/Ticket.entry";
import { Event } from "../base";
import { Database } from "@/controller/database";
import { TicketBuilder } from "@/class/TicketBuilder";
import { console } from "@/controller/console";
import { Message } from "discord.js";
const ticket = new Database<Ticket>({ table: 'Ticket' })

new Event({
  name: 'messageCreate',
  async run(message) {
    if (!message.inGuild()) return
    const { channelId, author, content, id } = message
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
      .save({ id: ticketData.id })
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
    await builder.setData(ticketData).save({ id: ticketData.id })
    console.info(`⚠️ Uma mensagem foi apagada! ticketId: ${ticketData.id}`)
  },
})