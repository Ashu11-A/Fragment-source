import { TemplateButtonBuilder } from "@/class/TemplateButtonBuilder.js";
import { Database } from "@/controller/database.js";
import { Component } from "@/discord/base/index.js";
import { ModalBuilder } from "@/discord/base/CustomIntetaction.js";
import TemplateTable from "@/entity/Template.entry.js";
import { ActionRowBuilder, APITextInputComponent, ComponentType, EmbedBuilder, TextInputBuilder } from "discord.js";

const templateDb = new Database<TemplateTable>({ table: 'Template' })
const notFound = new EmbedBuilder({
  title: '❌ Não encontrei o template no database!'
}).setColor('Red')

const elementsSelect: APITextInputComponent[] = [
  {
    label: '❓| Qual será o Título?',
    placeholder: 'Ex: Parceria',
    style: 1,
    max_length: 256,
    custom_id: 'title',
    type: ComponentType.TextInput
  },
  {
    label: '❓| Qual será a Descrição?',
    placeholder: 'Ex: Quero me tornar um parceiro.',
    style: 1,
    max_length: 256,
    custom_id: 'description',
    type: ComponentType.TextInput
  },
  {
    label: '❓| Qual será o Emoji? (somente um)',
    placeholder: 'Ex: 🎟️🎫💰🎲💵🗂️.',
    value: '💰',
    style: 1,
    max_length: 10,
    custom_id: 'emoji',
    type: ComponentType.TextInput
  }
]

new Component({
  customId: 'AddSelect',
  type: "Button",
  async run(interaction) {
    const modal = new ModalBuilder({
      title: 'Adicionar opções do SelectMenu',
      customId: 'AddSelect',
    })

    for (const element of elementsSelect) {
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder(element)))
    }

    await interaction.showModal(modal)
  },
})

new Component({
  customId: 'AddSelect',
  type: "Modal",
  async run(interaction) {
    const title = interaction.fields.getTextInputValue('title')
    const emoji = interaction.fields.getTextInputValue('emoji')
    const description = interaction.fields.getTextInputValue('description')
    const templateData = await templateDb.findOne({ where: { messageId: interaction.message?.id } })
    const buttonBuilder = new TemplateButtonBuilder()

    if (templateData === null) {
      await interaction.reply({ embeds: [notFound] })
      return
    }

    templateData.selects = [ ...(templateData.selects ?? []), { emoji, title, description }]

    await templateDb.save(templateData)
      .then(async () => {
        await interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder({
              title: '✅ Informações salvas com sucesso!'
            }).setColor('Green')
          ]
        })

        const components = buttonBuilder
          .setMode('debug')
          .setProperties(templateData.properties)
          .setSelects(templateData.selects)
          .setType(templateData.type)
          .render()

        await interaction.message?.edit({ components })
      })
      .catch(async () => {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: '❌ Ocorreu um erro ao tentar salvar as informações no database'
            }).setColor('Red')
          ]
        })
      })

    setTimeout(() => interaction.deleteReply(), 2000)
  }
})

new Component({
  customId: 'EditSelectMenu',
  type: 'StringSelect',
  async run(interaction) {
    // const buttonBuilder = new TemplateButtonBuilder()
    
    const templateData = await templateDb.findOne({ where: { messageId: interaction.message.id } })
    if (templateData === null) return
    
    // const components = buttonBuilder
    //   .setMode('debug')
    //   .setProperties(templateData.properties)
    //   .setSelects(templateData.selects)
    //   .setType(templateData.type)
    //   .render()    

  },
})

const elementsCategory: APITextInputComponent[] = [
  {
    label: '❓| Qual será o Nome?',
    placeholder: 'Ex: Parceria',
    style: 1,
    max_length: 25,
    custom_id: "title",
    type: ComponentType.TextInput
  },
  {
    label: '❓| Qual será o Emoji? (somente um)',
    placeholder: 'Ex: 🎟️🎫💰🎲💵🗂️.',
    value: '🎟️',
    style: 1,
    max_length: 10,
    custom_id: "emoji",
    type: ComponentType.TextInput
  }
]

new Component({
  customId: 'AddCategory',
  type: "Button",
  async run(interaction) {
    const modal = new ModalBuilder({
      title: 'Adicionar Categorias de Ticket',
      customId: 'AddCategory',
    })
  
    for (const element of elementsCategory) {
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder(element)))
    }
  
    await interaction.showModal(modal)
  },
})

new Component({
  customId: 'AddCategory',
  type: "Modal",
  async run(interaction) {
    const title = interaction.fields.getTextInputValue('title')
    const emoji = interaction.fields.getTextInputValue('emoji')
    const templateData = await templateDb.findOne({ where: { messageId: interaction.message?.id } })

    if (templateData === null) {
      await interaction.reply({ embeds: [notFound] })
      return
    }

    templateData.categories = [ ...(templateData.categories ?? []), { emoji, title }]

    await templateDb.save(templateData)
      .then(async () => {
        await interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder({
              title: '✅ Informações salvas com sucesso!'
            }).setColor('Green')
          ]
        })
      })
      .catch(async () => {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: '❌ Ocorreu um erro ao tentar salvar as informações no database'
            }).setColor('Red')
          ]
        })
      })

    setTimeout(() => interaction.deleteReply(), 2000)
  }
})