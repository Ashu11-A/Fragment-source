import { database } from '@/database'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { TypeTemplate } from '@/types/entries'
import { ResponderType } from '@constatic/base'
import { ActionDrawer, createResponder, Error, ModalBuilder } from 'discord'
import { TextInputBuilder, TextInputStyle } from 'discord.js'
import { userSelect } from '@/lib/openActionsCache.js'

export default createResponder({
  customId: 'SelectCategory',
  types: [ResponderType.StringSelect],
  async run (interaction) {
    if (!interaction.inCachedGuild()) return
    const { values, user } = interaction
    const [messageId, index] = values[0].split('_') as [string, string]
    const templateData = await database.template.findOne({ where: { messageId } })
    if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

    const category = templateData.categories[Number(index)]
    if (category === undefined) throw await new Error({ element: 'categoria', interaction }).notFound({ type: 'Database' }).reply()

    switch (templateData.type) {
    case TypeTemplate.Button:
      await new TicketBuilder({ interaction }).setOwner(user.id).setTemplateId(templateData.id).setTitle(category.title).setCategory({ emoji: category.emoji, title: category.title }).create()
      break
    case TypeTemplate.Modal: {
      const modal = new ModalBuilder({ customId: 'ModalOpen', title: 'Abrir novo ticket' })
      const rows = ActionDrawer<TextInputBuilder>([
        new TextInputBuilder({ customId: 'nickname', label: 'Qual seu Nick?', required: true, maxLength: 50, style: TextInputStyle.Short, placeholder: 'Coloque aqui seu nick' }),
        new TextInputBuilder({ customId: 'platform', label: 'Qual plataforma você joga?', required: true, maxLength: 20, style: TextInputStyle.Short, placeholder: 'Java ou Bedrock' }),
        new TextInputBuilder({ customId: 'description', label: 'Qual a descrição?', required: true, maxLength: 255, style: TextInputStyle.Paragraph, placeholder: 'Queria saber mais informações sobre...' })
      ], 1)
      userSelect.set(user.id, { category, templateId: templateData.id })
      await interaction.showModal(modal.setComponents(rows))
      break
    }
    }
  },
})
