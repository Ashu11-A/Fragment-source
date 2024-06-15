import { TicketBuilder } from "@/class/TicketBuilder.js";
import { Component } from "@/discord/base/Components.js";
import { ModalBuilder } from "@/discord/base/CustomIntetaction.js";
import { Error } from "@/discord/base/CustomResponse.js";
import { Category, TypeTemplate } from "@/entity/Template.entry.js";
import { ActionDrawer } from "@/functions/actionDrawer.js";
import { templateDB } from "@/functions/database.js";
import { TextInputBuilder, TextInputStyle } from "discord.js";

export const userSelect = new Map<string, { category: Category, templateId: number }>()

new Component({
  customId: 'SelectOpen',
  type: 'StringSelect',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    const { values, user } = interaction
    const [messageId, index] = values[0].split('_') as [string, string]

    const templateData = await templateDB.findOne({ where: { messageId } })
    if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: "Database" }).reply()
    
    const category = templateData.categories[Number(index)]
    if (category === undefined) throw await new Error({ element: 'categoria', interaction }).notFound({ type: "Database" }).reply()

    switch (templateData.type) {
    case TypeTemplate.Button:
      await new TicketBuilder({ interaction })
        .setOwner(user.id)
        .setTemplateId(templateData.id)
        .setTitle(category.title)
        .setCategory({ emoji: category.emoji, title: category.title })
        .create()
      break
    case TypeTemplate.Modal:
      const modal = new ModalBuilder({ customId: 'ModalOpen', title: 'Abrir novo ticket' })
      const rows = ActionDrawer<TextInputBuilder>([
        new TextInputBuilder({
          customId: 'description',
          label: 'Qual a descrição?',
          required: true,
          maxLength: 255,
          style: TextInputStyle.Paragraph,
          placeholder: 'Queria saber mais informações sobre...'
        })
      ], 1)
      userSelect.set(user.id, { category, templateId: templateData.id })
      await interaction.showModal(modal.setComponents(rows))
      break
    }
    
  },
})