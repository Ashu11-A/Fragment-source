import { database } from '@/database'
import { TemplateManager } from '@/class/TemplateManager.js'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { TypeTemplate } from '@/types/entries.js'
import { cacheSelectMenu, userSelect } from '@/lib/openActionsCache.js'
import { elementsSelect } from '@/lib/addSelectShared.js'
import { runEditButton, runEditModal, notFound } from '@/lib/editTicket.js'
import { ActionDrawer, Button, DiscordError, Modal, ModalBuilder, StringSelect } from 'discord'
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
  type SelectMenuComponentOptionData,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

// ─── Template Management Buttons ─────────────────────────────────────────────

export const Category = new Button({
  parser: 'Category',
  async onClick(interaction) {
    await interaction.reply({
      ephemeral: true,
      embeds: [new EmbedBuilder({
        title: 'Recurso movido!',
        description: 'Use os comandos:\n`/ticket category add`\n`/ticket category rem`'
      }).setColor('Orange')]
    })
  },
})

export const Config = new Button({
  parser: 'Config',
  async onClick(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await new TemplateManager({ interaction }).setMode('debug').edit({ messageId: interaction.message.id })
    if (interaction.deferred && !interaction.replied) await interaction.deleteReply()
  },
})

export const DeleteTemplate = new Button({
  parser: 'DeleteTemplate',
  async onClick(interaction) {
    if (!interaction.inCachedGuild()) return
    const initialInteraction = await interaction.reply({
      fetchReply: true,
      ephemeral: true,
      embeds: [new EmbedBuilder({ title: 'Deseja realmente apagar esse Template?' })],
      components: ActionDrawer([
        new ButtonBuilder({ customId: 'yes', emoji: { name: '✔️' }, style: ButtonStyle.Success }),
        new ButtonBuilder({ customId: 'no', emoji: { name: '✖️' }, style: ButtonStyle.Danger })
      ], 2)
    })
    const collector = initialInteraction.createMessageComponentCollector({ componentType: ComponentType.Button })
    collector.on('collect', async (subInteraction) => {
      collector.stop()
      if (subInteraction.customId === 'yes') {
        await new TemplateManager({ interaction: subInteraction }).delete({ messageId: interaction.message.id })
        return
      }
      await subInteraction.update({ embeds: [new EmbedBuilder({ title: 'Ação cancelada!' }).setColor('Green')], components: [] })
    })
    if (!interaction.replied) await interaction.deleteReply()
  },
})

export const MoreDetailsToggle = new Button({
  parser: 'MoreDetails',
  async onClick(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await new TemplateManager({ interaction }).switchData('MoreDetails').setMode('debug').edit({ messageId: interaction.message.id })
    await interaction.editReply({
      embeds: [new EmbedBuilder({
        title: 'Sobre:',
        description: 'A opção `Mais Detalhes`, fará com que um modal seja mostrado para melhor detalhamento do problema.'
      }).setColor('Orange')]
    })
    setTimeout(() => interaction.deleteReply(), 10000)
  },
})

export const Save = new Button({
  parser: 'Save',
  async onClick(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await new TemplateManager({ interaction }).setMode('production').edit({ messageId: interaction.message.id })
    if (!interaction.replied) await interaction.deleteReply()
  },
})

// ─── Select Edit Menu ─────────────────────────────────────────────────────────

export const EditSelectMenu = new StringSelect({
  parser: 'EditSelectMenu',
  async onSelect(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply()
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) throw await new DiscordError({ element: 'você', interaction }).forbidden().reply()

    const { message, values } = interaction
    const position = Number(values[0])
    const templateData = await database.template.findOne({ where: { messageId: message.id } })
    if (templateData === null) throw await new DiscordError({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

    templateData.selects.splice(position, 1)
    await new TemplateManager({ interaction }).setData(templateData).setMode('debug').edit({ messageId: message.id }).then(() => interaction.deleteReply())
  },
})

// ─── Add Select Actions ───────────────────────────────────────────────────────

export const AddSelectButton = new Button({
  parser: 'AddSelect',
  async onClick(interaction) {
    const modal = new ModalBuilder({ title: 'Adicionar opções do SelectMenu', customId: 'AddSelect' })
    for (const element of elementsSelect) {
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder(element)))
    }
    await interaction.showModal(modal)
  },
})

export const AddSelectModal = new Modal({
  parser: 'AddSelect',
  async onSubmit(interaction) {
    if (!interaction.inCachedGuild()) return
    const title = interaction.fields.getTextInputValue('title')
    const emoji = interaction.fields.getTextInputValue('emoji')
    const description = interaction.fields.getTextInputValue('description')
    const templateData = await database.template.findOne({ where: { messageId: interaction.message?.id } })

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
        const components = new TemplateManager({ interaction }).setMode('debug').setProperties(templateData.properties).setSelects(templateData.selects).setType(templateData.type).setSystem(templateData.systems ?? []).renderComponents()
        await interaction.message?.edit({ components })
      })
      .catch(async () => {
        await interaction.editReply({ embeds: [new EmbedBuilder({ title: '❌ Ocorreu um erro ao tentar salvar as informações no database' }).setColor('Red')] })
      })
    setTimeout(() => interaction.deleteReply(), 2000)
  },
})

// ─── Set Type Buttons ─────────────────────────────────────────────────────────

async function runSetType(interaction: ButtonInteraction<'cached'>, type: TypeTemplate): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const templateData = await database.template.findOne({ where: { messageId: interaction.message.id } })

  if (templateData !== null) {
    templateData.type = type
    await database.template.save(templateData)
      .then(async () => {
        await interaction.editReply({ embeds: [new EmbedBuilder({ title: '✅ Informações setados com sucesso' }).setColor('Green')] })
        setTimeout(() => interaction.deleteReply(), 5000)
        const components = new TemplateManager({ interaction })
          .setMode('debug')
          .setProperties(templateData.properties)
          .setSelects(templateData.selects)
          .setSystem(templateData.systems ?? [])
          .setType(type)
          .renderComponents()
        await interaction.message.edit({ components })
      })
      .catch(async () => {
        await interaction.editReply({ embeds: [new EmbedBuilder({ title: '❌ Ocorreu um erro ao tenatr salvar' }).setColor('Red')] })
      })
    return
  }
  await interaction.editReply({ embeds: [new EmbedBuilder({ title: 'Não encontrei esse Template de ticket!' }).setColor('Red')] })
}

export const SetButton = new Button({
  parser: 'SetButton',
  async onClick(interaction) { await runSetType(interaction, TypeTemplate.Button) },
})

export const SetModal = new Button({
  parser: 'SetModal',
  async onClick(interaction) { await runSetType(interaction, TypeTemplate.Modal) },
})

export const SetSelect = new Button({
  parser: 'SetSelect',
  async onClick(interaction) { await runSetType(interaction, TypeTemplate.Select) },
})

// ─── Edit Ticket Buttons & Modals ─────────────────────────────────────────────

export const SetTitleButton = new Button({
  parser: 'setTitle',
  async onClick(interaction) { await runEditButton(interaction, 'setTitle') },
})

export const SetTitleModal = new Modal({
  parser: 'setTitle',
  async onSubmit(interaction) { await runEditModal(interaction, 'setTitle') },
})

export const SetDescriptionButton = new Button({
  parser: 'setDescription',
  async onClick(interaction) { await runEditButton(interaction, 'setDescription') },
})

export const SetDescriptionModal = new Modal({
  parser: 'setDescription',
  async onSubmit(interaction) { await runEditModal(interaction, 'setDescription') },
})

export const SetThumbnailButton = new Button({
  parser: 'setThumbnail',
  async onClick(interaction) { await runEditButton(interaction, 'setThumbnail') },
})

export const SetThumbnailModal = new Modal({
  parser: 'setThumbnail',
  async onSubmit(interaction) { await runEditModal(interaction, 'setThumbnail') },
})

export const SetImageButton = new Button({
  parser: 'setImage',
  async onClick(interaction) { await runEditButton(interaction, 'setImage') },
})

export const SetImageModal = new Modal({
  parser: 'setImage',
  async onSubmit(interaction) { await runEditModal(interaction, 'setImage') },
})

export const SetColorButton = new Button({
  parser: 'setColor',
  async onClick(interaction) { await runEditButton(interaction, 'setColor') },
})

export const SetColorModal = new Modal({
  parser: 'setColor',
  async onSubmit(interaction) { await runEditModal(interaction, 'setColor') },
})

// ─── Open Actions ─────────────────────────────────────────────────────────────

export const Open = new Button({
  parser: 'Open',
  async onClick(interaction) {
    if (!interaction.inCachedGuild()) return
    const { user, message } = interaction
    const ticket = new TicketBuilder({ interaction })
    const templateData = await database.template.findOne({ where: { messageId: message.id } })
    if (templateData === null) throw await new DiscordError({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

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

export const ModalOpen = new Modal({
  parser: 'ModalOpen',
  async onSubmit(interaction) {
    if (!interaction.inCachedGuild()) return
    const { fields, user } = interaction
    const description = fields.getTextInputValue('description')
    const cache = userSelect.get(user.id)
    userSelect.delete(user.id)

    const builder = new TicketBuilder({ interaction }).setOwner(user.id).setDescription(description)
    if (cache !== undefined) { builder.setCategory(cache.category); builder.setTemplateId(cache.templateId) }
    await builder.create()
  },
})

export const MoreDetailsModal = new Modal({
  parser: 'MoreDetails',
  async onSubmit(interaction) {
    const { fields, user } = interaction
    if (!interaction.inCachedGuild()) return
    const description = fields.getTextInputValue('description')
    const cache = cacheSelectMenu.get(user.id)
    if (cache !== undefined) cacheSelectMenu.delete(user.id)
    const builder = new TicketBuilder({ interaction }).setOwner(user.id).setDescription(description)
    if (cache !== undefined) builder.setTitle(cache.title).setCategory(cache)
    await builder.create()
  },
})

export const SelectCategory = new StringSelect({
  parser: 'SelectCategory',
  async onSelect(interaction) {
    if (!interaction.inCachedGuild()) return
    const { values, user } = interaction
    const [messageId, index] = values[0].split('_') as [string, string]
    const templateData = await database.template.findOne({ where: { messageId } })
    if (templateData === null) throw await new DiscordError({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

    const category = templateData.categories[Number(index)]
    if (category === undefined) throw await new DiscordError({ element: 'categoria', interaction }).notFound({ type: 'Database' }).reply()

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

export const SelectMenu = new StringSelect({
  parser: 'SelectMenu',
  async onSelect(interaction) {
    if (!interaction.inCachedGuild()) return
    const { values, message, user } = interaction
    const select = values[0]

    if (select === 'config') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) throw await new DiscordError({ element: 'você', interaction }).forbidden().reply()
      await new TemplateManager({ interaction }).setMode('debug').edit({ messageId: message.id })
      await interaction.deleteReply()
      return
    }

    const templateData = await database.template.findOne({ where: { messageId: message.id } })
    if (templateData === null) throw await new DiscordError({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

    const typeTicket = templateData?.selects[Number(select)]
    if (typeTicket === undefined) throw await new DiscordError({ element: 'select', interaction }).notFound({ type: 'Database' }).reply()

    const moreDetails = (templateData.systems ?? []).find((system) => system.name === 'MoreDetails')?.isEnabled
    if (moreDetails) {
      const modal = new ModalBuilder({ customId: 'MoreDetails', title: 'Conte-nos mais sobre o seu problema' })
      const row = ActionDrawer<TextInputBuilder>([new TextInputBuilder({ customId: 'description', label: 'Qual a descrição?', required: true, maxLength: 255, style: TextInputStyle.Paragraph, placeholder: 'Queria saber mais informações sobre...' })], 1)
      await interaction.showModal(modal.setComponents(row))
      cacheSelectMenu.set(user.id, typeTicket)
      return
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await new TicketBuilder({ interaction }).setOwner(user.id).setTitle(typeTicket.title).setDescription(typeTicket.description).setCategory({ emoji: typeTicket.emoji, title: typeTicket.title }).create()
  },
})
