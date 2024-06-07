import { ClaimBuilder } from "@/class/ClaimBuilder";
import { TicketBuilder } from "@/class/TicketBuilder";
import { Database } from "@/controller/database";
import { Component } from "@/discord/base";
import { Error } from "@/discord/base/CustomResponse";
import Claim from "@/entity/Claim.entry";
import Ticket from "@/entity/Ticket.entry";
import { EmbedBuilder } from "discord.js";
const ticket = new Database<Ticket>({ table: 'Ticket' })
const claim = new Database<Claim>({ table: 'Claim' })

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
      .update({ id: ticketData.id })

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

new Component({
  customId: 'Close',
  type: "Button",
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    const { channelId } = interaction
    const ticketData = await ticket.findOne({ where: { channelId } })
    if (ticketData === null) return await new Error({ element: 'ticket', interaction }).notFound({ type: "Database" }).reply()

    const claimData = await claim.findOne({ where: { ticket: { id: ticketData.id } }, relations: { ticket: true } })
    if (claimData === null) return await new Error({ element: 'claim desse ticket', interaction }).notFound({ type: "Database" }).reply()

    const ticketBuilder = new TicketBuilder({ interaction })
    const claimBuilder = new ClaimBuilder({ interaction })
  
    await ticketBuilder.delete({ id: ticketData.id })
    await claimBuilder.delete({ id: claimData.id })
  },
})