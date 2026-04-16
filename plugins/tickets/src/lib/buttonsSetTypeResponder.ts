import { database } from '@/database'
import { TemplateButtonBuilder } from '@/class/TemplateButtonBuilder.js'
import { TypeTemplate } from '@/types/entries'
import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { EmbedBuilder, MessageFlags } from 'discord.js'

export function createSetTypeResponder (customId: string, type: TypeTemplate) {
  return createResponder({
    customId,
    types: [ResponderType.Button],
    async run (interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      const templateData = await database.template.findOne({ where: { messageId: interaction.message.id } })

      if (templateData !== null) {
        templateData.type = type
        await database.template.save(templateData)
          .then(async () => {
            await interaction.editReply({ embeds: [new EmbedBuilder({ title: '✅ Informações setados com sucesso' }).setColor('Green')] })
            setTimeout(() => interaction.deleteReply(), 5000)
            const components = new TemplateButtonBuilder()
              .setMode('debug')
              .setProperties(templateData.properties)
              .setSelects(templateData.selects)
              .setSystem(templateData.systems ?? [])
              .setType(type)
              .render()
            await interaction.message.edit({ components })
          })
          .catch(async () => {
            await interaction.editReply({ embeds: [new EmbedBuilder({ title: '❌ Ocorreu um erro ao tenatr salvar' }).setColor('Red')] })
          })
        return
      }
      await interaction.editReply({ embeds: [new EmbedBuilder({ title: 'Não encontrei esse Template de ticket!' }).setColor('Red')] })
    },
  })
}
