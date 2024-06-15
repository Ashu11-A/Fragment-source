import { TicketBuilder } from "@/class/TicketBuilder.js";
import { ModalBuilder, StringSelectMenuBuilder } from "@/discord/base/CustomIntetaction.js";
import { Error } from "@/discord/base/CustomResponse.js";
import { Component } from "@/discord/base/index.js";
import { TypeTemplate } from "@/entity/Template.entry.js";
import { ActionDrawer } from "@/functions/actionDrawer.js";
import { templateDB } from "@/functions/database.js";
import { SelectMenuComponentOptionData, TextInputBuilder, TextInputStyle } from "discord.js";

new Component({
  customId: 'Open',
  type: 'Button',
  cache: 'cached',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    const { user, message } = interaction
    const ticket = new TicketBuilder({ interaction })

    const templateData = await templateDB.findOne({ where: { messageId: message.id } })
    if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

    if (templateData.type === TypeTemplate.Button) await interaction.deferReply({ ephemeral: true })
    
    if ((templateData.categories ?? []).length > 0) {
      switch (templateData.type) {
      case TypeTemplate.Button:
      case TypeTemplate.Modal:
        const options: SelectMenuComponentOptionData[] = []

        for (const [index, category] of Object.entries(templateData.categories)) {
          options.push({ label: category.title, emoji: category.emoji, value: `${message.id}_${index}` })
        }
        const select = ActionDrawer<StringSelectMenuBuilder>([new StringSelectMenuBuilder({
          customId: 'SelectOpen',
          placeholder: 'Selecione a categoria do seu Ticket',
          minValues: 1,
          maxValues: 1,
          options
        })], 1)
        await interaction.editReply({ components: select })
      }
    } else {
      switch (templateData.type) {
      case TypeTemplate.Button: {
        await ticket.setOwner(user.id).render().create()
        break
      }
      case TypeTemplate.Modal: {
        const modal = new ModalBuilder({ customId: 'ModalOpen', title: 'Abrir novo ticket' })
        const rows = ActionDrawer<TextInputBuilder>([
          new TextInputBuilder({
            custom_id: 'title',
            label: 'Qual é o motivo do ticket?',
            required: true,
            max_length: 150,
            style: TextInputStyle.Short,
            placeholder: 'Dúvida... Denúncia... Pedido...'
          }),
          new TextInputBuilder({
            customId: 'description',
            label: 'Qual a descrição?',
            required: true,
            maxLength: 255,
            style: TextInputStyle.Paragraph,
            placeholder: 'Queria saber mais informações sobre...'
          })
        ], 1)
  
        modal.setComponents(rows)
        await interaction.showModal(modal)
        break
      }
      }
    }
  }
})