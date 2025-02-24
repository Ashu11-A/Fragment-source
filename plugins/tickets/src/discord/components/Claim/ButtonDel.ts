import { TicketBuilder } from '@/class/TicketBuilder.js'
import { Component, YouSure, Error } from 'discord'
import { database } from '@/utils/database'
import { MessageFlags } from 'discord.js'

new Component({
  customId: 'Delete',
  type: 'Button',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const { message } = interaction
    const claimData = await database.claim.findOne({ where: { messageId: message.id }, relations: { ticket: true } })
    if (claimData === null) throw await new Error({ element: 'este claim', interaction }).notFound({ type: 'Database' }).reply()

    const builder = new TicketBuilder({ interaction })
    const isDeletable = await new YouSure({ interaction, title: 'Tem certeza que desseja deletar este ticket?' }).question()

    if (isDeletable) await builder.setTicket(claimData.ticket.channelId).delete()
  },
})