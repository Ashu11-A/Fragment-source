import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import type { PluginContext } from 'discord'
import { MessageFlags } from 'discord.js'

export default function register(ctx: PluginContext): void {
  ctx.component({
    customId: 'Config',
    type: 'Button',
    async run(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      await new TemplateBuilder({ interaction }).setMode('debug').edit({ messageId: interaction.message.id })
      if (interaction.deferred && !interaction.replied) await interaction.deleteReply()
    },
  })
}
