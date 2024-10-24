import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { TypeTemplate, type Category, type Select } from '@/entity/Template.entry.js'
import { templateDB } from '@/utils/database'
import { Component, Error, ModalBuilder, StringSelectMenuBuilder } from 'discord'
import { PermissionsBitField, TextInputBuilder, TextInputStyle, type SelectMenuComponentOptionData } from 'discord.js'
import { ActionDrawer } from 'utils'

export const userSelect = new Map<string, { category: Category, templateId: number }>()

/**
 * Os Types Button e Modal são dependentes deste Componente.
 * Caso exista categorias criadas, ele mostrará um select menu antes.
 */
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

    const moreDetails = (templateData.systems ?? []).find((system) => system.name === 'MoreDetails')?.isEnabled
    
    if ((templateData.categories ?? []).length > 0) {
      await interaction.deferReply({ ephemeral: true })

      switch (templateData.type) {
      case TypeTemplate.Button:
      case TypeTemplate.Modal: {
        const options: SelectMenuComponentOptionData[] = []

        for (const [index, category] of Object.entries(templateData.categories)) {
          options.push({ label: category.title, emoji: category.emoji, value: `${message.id}_${index}` })
        }
        const select = ActionDrawer<StringSelectMenuBuilder>([new StringSelectMenuBuilder({
          customId: 'SelectCategory',
          placeholder: 'Selecione a categoria do seu Ticket',
          minValues: 1,
          maxValues: 1,
          options
        })], 1)
        await interaction.editReply({ components: select })
      }
      }
    } else {
      if (templateData.type === TypeTemplate.Button && !moreDetails) await interaction.deferReply({ ephemeral: true })

      switch (templateData.type) {
      case TypeTemplate.Button: {
        if (moreDetails) {
          const modal = new ModalBuilder({ customId: 'MoreDetails', title: 'Conte-nos mais sobre o seu problema' })
          const row = ActionDrawer<TextInputBuilder>([
            new TextInputBuilder({
              customId: 'description',
              label: 'Qual a descrição?',
              required: true,
              maxLength: 255,
              style: TextInputStyle.Paragraph,
              placeholder: 'Queria saber mais informações sobre...'
            })
          ], 1)
          await interaction.showModal(modal.setComponents(row))
          return
        }

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

/**
 * Este componente serve para selecionar a categoria do ticket para Button e Modal, caso exista categorias.
 */
new Component({
  customId: 'SelectCategory',
  type: 'StringSelect',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    const { values, user } = interaction
    const [messageId, index] = values[0].split('_') as [string, string]
  
    const templateData = await templateDB.findOne({ where: { messageId } })
    if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()
      
    const category = templateData.categories[Number(index)]
    if (category === undefined) throw await new Error({ element: 'categoria', interaction }).notFound({ type: 'Database' }).reply()
  
    switch (templateData.type) {
    case TypeTemplate.Button:
      await new TicketBuilder({ interaction })
        .setOwner(user.id)
        .setTemplateId(templateData.id)
        .setTitle(category.title)
        .setCategory({ emoji: category.emoji, title: category.title })
        .create()
      break
    case TypeTemplate.Modal: {
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
    }
  }
})

/**
 * Se o Type do Template for Modal.
 * Este componente também tem a compatibilidade com as caregorias por meio de um Map.
 */
new Component({
  customId: 'ModalOpen',
  type: 'Modal',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    const { fields, user } = interaction
    const title = fields.fields.find((field) => field.customId === 'title')?.value as string | undefined
    const description = fields.fields.find((field) => field.customId === 'description')?.value as string
  
    const cache = userSelect.get(user.id)
    userSelect.delete(user.id)
  
    const builder = new TicketBuilder({ interaction })
    if (title !== undefined) builder.setTitle(title)
    if (cache !== undefined) { builder.setCategory(cache.category); builder.setTemplateId(cache.templateId) }
    builder.setOwner(user.id)
    builder.setDescription(description)
    await builder.create()
  },
})

const cacheSelectMenu = new Map<string, Select>()

/**
 * Se o Type do template for Select.
 */
new Component({
  customId: 'SelectMenu',
  type: 'StringSelect',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    const { values, message, user } = interaction
    const select = values[0]
    
    if (select === 'config') {
      await interaction.deferReply({ ephemeral: true })
      if (!(interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator ?? false))){
        throw await new Error({ element: 'você', interaction }).forbidden().reply()
      }
      await new TemplateBuilder({ interaction }).setMode('debug').edit({ messageId: message.id })
      await interaction.deleteReply()
      return
    }

    const templateData = await templateDB.findOne({ where: { messageId: message.id } })
    if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

    const typeTicket = templateData?.selects[Number(select)]
    if (typeTicket === undefined) throw await new Error({ element: 'select', interaction }).notFound({ type: 'Database' }).reply()

    const moreDetails = (templateData.systems ?? []).find((system) => system.name === 'MoreDetails')?.isEnabled
    if (moreDetails) {
      const modal = new ModalBuilder({ customId: 'MoreDetails', title: 'Conte-nos mais sobre o seu problema' })
      const row = ActionDrawer<TextInputBuilder>([
        new TextInputBuilder({
          customId: 'description',
          label: 'Qual a descrição?',
          required: true,
          maxLength: 255,
          style: TextInputStyle.Paragraph,
          placeholder: 'Queria saber mais informações sobre...'
        })
      ], 1)
      await interaction.showModal(modal.setComponents(row))
      cacheSelectMenu.set(user.id, typeTicket)
      return
    }
    await interaction.deferReply({ ephemeral: true })

    await new TicketBuilder({ interaction })
      .setOwner(user.id)
      .setTitle(typeTicket.title)
      .setDescription(typeTicket.description)
      .setCategory({ emoji: typeTicket.emoji, title: typeTicket.title })
      .create()
  }
})

new Component({
  customId: 'MoreDetails',
  type: 'Modal',
  async run(interaction) {
    const { fields, user } = interaction
    if (!interaction.inCachedGuild()) return
    const description = fields.getTextInputValue('description')
    const cache = cacheSelectMenu.get(user.id)
    if (cache !== undefined) cacheSelectMenu.delete(user.id)

    const builder = new TicketBuilder({ interaction })
      .setOwner(user.id)
      .setDescription(description)

    if (cache !== undefined) builder.setTitle(cache.title).setCategory(cache)

    await builder.create()
  },
})