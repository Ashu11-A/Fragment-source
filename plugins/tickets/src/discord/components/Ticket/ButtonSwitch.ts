import { database } from '@/database'
import { ClaimBuilder } from '@/class/ClaimBuilder.js'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import type Ticket from '@/database/entity/Ticket.entry.js'
import { ResponderType } from '@constatic/base'
import { createResponder, Error } from 'discord'
import { EmbedBuilder, MessageFlags } from 'discord.js'
  
export default createResponder({
  customId: 'Switch',
  types: [ResponderType.Button],
  async run(interaction) {
    const { guild, channelId, user, message } = interaction
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    if (guild === null) return await new Error({ element: 'executar essa ação pois você teve estar em uma Guilda!', interaction }).notPossible().reply()

    let ticketData: Ticket | null
    let claimId: string | undefined
    let ephemeral = false

    ticketData = await database.ticket.findOne({ where: { channelId }, relations: { claim: true } })
    if (ticketData === null) {
      ephemeral = true
      const claimData = await database.claim.findOne({ where: { messageId: message.id }, relations: { ticket: true } })
      ticketData = claimData?.ticket ?? null
      claimId = claimData?.messageId
    } else {
      claimId = ticketData.claim?.messageId
    }
    if (ticketData === null) return await new Error({ element: `o ticket ${channelId}`, interaction }).notFound({ type: 'Database' }).reply()
    if (claimId === undefined) return await new Error({ element: 'claim', interaction }).notFound({ type: 'Database' }).reply()

    const isClosed = !ticketData.closed
    const builder = new TicketBuilder({ interaction })
    const claim = new ClaimBuilder({ interaction })

    const embed = new EmbedBuilder({
      title: isClosed ? '🔒 Ticket fechado!' : '🔓 Ticket aberto!',
      footer: { text: `Por: ${user.displayName} | Id: ${user.id}`, iconURL: user?.avatarURL() ?? undefined }
    }).setColor(isClosed ? 'Red' : 'Green')

    const ticket = await (await builder.setData(ticketData).setClosed(!ticketData.closed).addEvent({ user: { id: user.id, name: user.displayName }, message: `Usuário ${user.displayName}(${user.id}), fechou o ticket!`, date: new Date() }).update())?.send([embed])
    await claim.setData(ticket?.options as Ticket).edit({ messageId: claimId })

    if (ephemeral) { interaction.editReply({ embeds: [embed] }); return }
    await interaction.deleteReply()
  },
})

