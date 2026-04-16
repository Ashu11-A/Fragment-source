import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { MessageFlags } from 'discord.js'

export default createResponder({
  customId: 'Save',
  types: [ResponderType.Button],
  async run(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await new TemplateBuilder({ interaction }).setMode('production').edit({ messageId: interaction.message.id })
    if (!interaction.replied) await interaction.deleteReply()
  },
})

