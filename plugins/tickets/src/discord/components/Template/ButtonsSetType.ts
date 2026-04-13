import { TemplateButtonBuilder } from '@/class/TemplateButtonBuilder.js'
import { TypeTemplate } from '@/types/entries'
import { createDatabase } from '@/utils/database'
import type { PluginContext } from 'discord'
import { EmbedBuilder, MessageFlags } from 'discord.js'

const actions: Record<string, TypeTemplate> = {
  SetSelect: TypeTemplate.Select,
  SetButton: TypeTemplate.Button,
  SetModal: TypeTemplate.Modal,
}

export default function register(ctx: PluginContext): void {
  const database = createDatabase(ctx)

  for (const [action, type] of Object.entries(actions)) {
    ctx.component({
      customId: action,
      type: 'Button',
      async run(interaction) {
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
}
