import { TicketBuilder } from "@/class/TicketBuilder.js";
import { Database } from "@/controller/database.js";
import { Error } from "@/discord/base/CustomResponse.js";
import { Component } from "@/discord/base/index.js";
import Ticket from "@/entity/Ticket.entry.js";
import { EmbedBuilder } from "discord.js";
const ticket = new Database<Ticket>({ table: 'Ticket' })

new Component({
  customId: 'Switch',
  type: "Button",
  async run(interaction) {
    const { guild, channelId, channel, user } = interaction
    if (!interaction.inCachedGuild()) return
    interaction.deferReply({ ephemeral: true })
    if (guild === null) return await new Error({ element: 'executar essa ação pois você teve estar em uma Guilda!', interaction }).notPossible().reply()

    const ticketData = (await ticket.findOne({ where: { channelId } }))
    if (ticketData === null) return await new Error({ element: `o ticket ${channelId}`, interaction }).notFound({ type: 'Database' }).reply()

    const isClosed = !ticketData.closed
    const builder = new TicketBuilder({ interaction })

    await builder
      .setData(ticketData)
      .setClosed(!ticketData.closed)
      .addEvent({
        user: { id: user.id, name: user.displayName },
        message: `Usuário ${user.displayName}(${user.id}), fechou o ticket!`,
        date: new Date(),
      })
      .update()

    await interaction.deleteReply()
    await channel?.send({
      embeds: [
        new EmbedBuilder({
          title: isClosed ? '🔒 Ticket fechado!' : '🔓 Ticket aberto!',
          footer: { text: `Por: ${user.displayName} | Id: ${user.id}`, iconURL: user?.avatarURL() ?? undefined }
        }).setColor(isClosed ? 'Red' : 'Green')
      ]
    })
  },
})