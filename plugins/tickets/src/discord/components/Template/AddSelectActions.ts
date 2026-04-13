import { TemplateButtonBuilder } from '@/class/TemplateButtonBuilder.js'
import { createDatabase } from '@/utils/database'
import { ModalBuilder } from 'discord'
import type { PluginContext } from 'discord'
import { ActionRowBuilder, type APITextInputComponent, ComponentType, EmbedBuilder, TextInputBuilder } from 'discord.js'

const notFound = new EmbedBuilder({ title: '❌ Não encontrei o template no database!' }).setColor('Red')

const elementsSelect: APITextInputComponent[] = [
  { label: '❓| Qual será o Título?', placeholder: 'Ex: Parceria', style: 1, max_length: 256, custom_id: 'title', type: ComponentType.TextInput },
  { label: '❓| Qual será a Descrição?', placeholder: 'Ex: Quero me tornar um parceiro.', style: 1, max_length: 256, custom_id: 'description', type: ComponentType.TextInput },
  { label: '❓| Qual será o Emoji? (somente um)', placeholder: 'Ex: 🎟️🎫💰🎲💵🗂️.', value: '💰', style: 1, max_length: 10, custom_id: 'emoji', type: ComponentType.TextInput },
]

export default function register(ctx: PluginContext): void {
  const database = createDatabase(ctx)

  ctx.component({
    customId: 'AddSelect',
    type: 'Button',
    async run(interaction) {
      const modal = new ModalBuilder({ title: 'Adicionar opções do SelectMenu', customId: 'AddSelect' })
      for (const element of elementsSelect) {
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder(element)))
      }
      await interaction.showModal(modal)
    },
  })

  ctx.component({
    customId: 'AddSelect',
    type: 'Modal',
    async run(interaction) {
      const title = interaction.fields.getTextInputValue('title')
      const emoji = interaction.fields.getTextInputValue('emoji')
      const description = interaction.fields.getTextInputValue('description')
      const templateData = await database.template.findOne({ where: { messageId: interaction.message?.id } })
      const buttonBuilder = new TemplateButtonBuilder()

      if (templateData === null) { await interaction.reply({ embeds: [notFound], ephemeral: true }); return }

      const exist = (templateData.selects ?? []).find((select) => select.title.toLowerCase() === title.toLowerCase())
      if (exist !== undefined) {
        await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder({ title: 'Já existe um select com este nome, tente outro que não exista!' }).setColor('Red')] })
        return
      }

      templateData.selects = [...(templateData.selects ?? []), { emoji, title, description }]
      await database.template.save(templateData)
        .then(async () => {
          await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder({ title: '✅ Informações salvas com sucesso!' }).setColor('Green')] })
          const components = buttonBuilder.setMode('debug').setProperties(templateData.properties).setSelects(templateData.selects).setType(templateData.type).setSystem(templateData.systems ?? []).render()
          await interaction.message?.edit({ components })
        })
        .catch(async () => {
          await interaction.editReply({ embeds: [new EmbedBuilder({ title: '❌ Ocorreu um erro ao tentar salvar as informações no database' }).setColor('Red')] })
        })
      setTimeout(() => interaction.deleteReply(), 2000)
    },
  })
}
