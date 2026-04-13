import { Ticket } from '@/class/Ticket.js'
import type { PluginContext } from 'discord'
import { MessageFlags } from 'discord.js'

export default function register(ctx: PluginContext): void {
  ctx.component({
    customId: 'Transcript',
    type: 'Button',
    async run(interaction) {
      if (!interaction.inCachedGuild()) return
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      await new Ticket({ interaction }).transcript({ messageId: interaction.message.id })
    },
  })
}
