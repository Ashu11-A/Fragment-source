import { Ticket } from '@/class/Ticket.js'
import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { MessageFlags } from 'discord.js'

export default createResponder({
  customId: 'Transcript',
  types: [ResponderType.Button],
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await new Ticket({ interaction }).transcript({ messageId: interaction.message.id })
  },
})

