import { TicketBuilder } from '@/class/TicketBuilder.js'
import { Component } from '@/discord/base/Components.js'
import { YouSure } from '@/discord/base/CustomIntetaction.js'
import { Error } from '@/discord/base/CustomResponse.js'
import { claimDB } from '@/functions/database.js'

new Component({
  customId: 'Delete',
  type: 'Button',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ ephemeral: true })
    const { message } = interaction
    const claimData = await claimDB.findOne({ where: { messageId: message.id }, relations: { ticket: true } })
    if (claimData === null) throw await new Error({ element: 'este claim', interaction }).notFound({ type: 'Database' }).reply()

    const builder = new TicketBuilder({ interaction })
    const isDeletable = await new YouSure({ interaction, title: 'Tem certeza que desseja deletar este ticket?' }).question()

    if (isDeletable) await builder.setTicket(claimData.ticket.channelId).delete()
  },
})