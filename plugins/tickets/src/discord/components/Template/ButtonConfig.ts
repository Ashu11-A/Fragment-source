import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { MessageFlags } from 'discord.js'

export default createResponder({
  customId: 'Config',
  types: [ResponderType.Button],
  async run(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await new TemplateBuilder({ interaction }).setMode('debug').edit({ messageId: interaction.message.id })
    if (interaction.deferred && !interaction.replied) await interaction.deleteReply()
  },
})

