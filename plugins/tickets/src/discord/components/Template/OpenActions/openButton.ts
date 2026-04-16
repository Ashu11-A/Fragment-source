import { database } from '@/database'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { TypeTemplate } from '@/types/entries'
import { ResponderType } from '@constatic/base'
import { ActionDrawer, createResponder, Error, ModalBuilder, StringSelectMenuBuilder } from 'discord'
import { MessageFlags, TextInputBuilder, TextInputStyle, type SelectMenuComponentOptionData } from 'discord.js'

export default createResponder({
  customId: 'Open',
  types: [ResponderType.Button],
  cache: 'cached',
  async run (interaction) {
    if (!interaction.inCachedGuild()) return
    const { user, message } = interaction
    const ticket = new TicketBuilder({ interaction })
    const templateData = await database.template.findOne({ where: { messageId: message.id } })
    if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

    const moreDetails = (templateData.systems ?? []).find((system) => system.name === 'MoreDetails')?.isEnabled

    if ((templateData.categories ?? []).length > 0) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      switch (templateData.type) {
      case TypeTemplate.Button:
      case TypeTemplate.Modal: {
        const options: SelectMenuComponentOptionData[] = []
        for (const [index, category] of Object.entries(templateData.categories)) {
          options.push({ label: category.title, emoji: category.emoji, value: `${message.id}_${index}` })
        }
        const select = ActionDrawer<StringSelectMenuBuilder>([new StringSelectMenuBuilder({ customId: 'SelectCategory', placeholder: 'Selecione a categoria do seu Ticket', minValues: 1, maxValues: 1, options })], 1)
        await interaction.editReply({ components: select })
      }
      }
    } else {
      if (templateData.type === TypeTemplate.Button && !moreDetails) await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      switch (templateData.type) {
      case TypeTemplate.Button: {
        if (moreDetails) {
          const modal = new ModalBuilder({ customId: 'MoreDetails', title: 'Conte-nos mais sobre o seu problema' })
          const rows = ActionDrawer<TextInputBuilder>([
            new TextInputBuilder({ customId: 'nickname', label: 'Qual seu Nick?', required: true, maxLength: 20, style: TextInputStyle.Short, placeholder: 'Coloque aqui seu nick' }),
            new TextInputBuilder({ customId: 'platform', label: 'Qual plataforma você joga?', required: true, maxLength: 7, style: TextInputStyle.Short, placeholder: 'Java ou Bedrock' }),
            new TextInputBuilder({ customId: 'description', label: 'Qual a descrição?', required: true, maxLength: 255, style: TextInputStyle.Paragraph, placeholder: 'Queria saber mais informações sobre...' })
          ], 1)
          await interaction.showModal(modal.setComponents(rows))
          return
        }
        await ticket.setOwner(user.id).render().create()
        break
      }
      case TypeTemplate.Modal: {
        const modal = new ModalBuilder({ customId: 'ModalOpen', title: 'Abrir novo ticket' })
        const rows = ActionDrawer<TextInputBuilder>([
          new TextInputBuilder({ customId: 'nickname', label: 'Qual seu Nick?', required: true, maxLength: 50, style: TextInputStyle.Short, placeholder: 'Coloque aqui seu nick' }),
          new TextInputBuilder({ customId: 'platform', label: 'Qual plataforma você joga?', required: true, maxLength: 20, style: TextInputStyle.Short, placeholder: 'Java ou Bedrock' }),
          new TextInputBuilder({ customId: 'description', label: 'Qual a descrição?', required: true, maxLength: 255, style: TextInputStyle.Paragraph, placeholder: 'Queria saber mais informações sobre...' })
        ], 1)
        modal.setComponents(rows)
        await interaction.showModal(modal)
        break
      }
      }
    }
  },
})
