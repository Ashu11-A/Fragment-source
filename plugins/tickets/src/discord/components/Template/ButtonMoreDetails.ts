import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { EmbedBuilder, MessageFlags } from 'discord.js'

export default createResponder({
  customId: 'MoreDetails',
  types: [ResponderType.Button],
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await new TemplateBuilder({ interaction }).switchData('MoreDetails').setMode('debug').edit({ messageId: interaction.message.id })
    await interaction.editReply({
      embeds: [new EmbedBuilder({
        title: 'Sobre:',
        description: 'A opção `Mais Detalhes`, fará com que um modal seja mostrado para melhor detalhamento do problema.'
      }).setColor('Orange')]
    })
    setTimeout(() => interaction.deleteReply(), 10000)
  },
})

