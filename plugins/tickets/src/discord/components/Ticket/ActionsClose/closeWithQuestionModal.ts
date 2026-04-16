import { TicketBuilder } from '@/class/TicketBuilder.js'
import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { MessageFlags } from 'discord.js'

export default createResponder({
  customId: 'Close-With-Question',
  types: [ResponderType.Modal],
  async run (interaction) {
    const { channelId, fields } = interaction
    if (!interaction.inCachedGuild() || channelId === null) return
    const observation = fields.getTextInputValue('observation')
    const reason = fields.getTextInputValue('reason')
    const builder = new TicketBuilder({ interaction })
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await (await builder.setTicket(channelId).loader()).delete({ observation, reason })
  },
})
