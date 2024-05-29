import { Template } from "@/class/Template"
import { TemplateButtonBuilder } from "@/class/TemplateButtonBuilder"
import { Database } from "@/controller/database"
import { Component } from "@/discord/base"
import TemplateTable, { TypeTemplate } from "@/entity/Template.entry"
import { EmbedBuilder } from "discord.js"

const template = new Database<TemplateTable>({ table: 'Template' })
const actions = {
  SetSelect: TypeTemplate.Select,
  SetButton: TypeTemplate.Button,
  SetModal: TypeTemplate.Modal
}

for (const [action, type] of Object.entries(actions)) {
  new Component({
    customId: action,
    type: 'Button',
    async run(interaction) {
      await interaction.deferReply({ ephemeral: true })
      const templateData = await template.findOne({ where: { messageId: interaction.message.id } })

      if (templateData !== null) {
        templateData.type = type
        await template.save(templateData)
          .then(async () => {
            await interaction.editReply({
              embeds: [new EmbedBuilder({
                title: '✅ Informações setados com sucesso'
              }).setColor('Green')]
            })

            const buttonBuilder = new TemplateButtonBuilder({ interaction })
            const components = buttonBuilder
              .setMode('debug')
              .setProperties(templateData.properties)
              .setSelects(templateData.selects)
              .setType(type)
              .render()

            await interaction.message.edit({ components })
          })
          .catch(async () => {
            await interaction.editReply({
              embeds: [new EmbedBuilder({
                title: '❌ Ocorreu um erro ao tenatr salvar'
              }).setColor('Red')]
            })
          })
        return
      }
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: 'Não encontrei esse Template de ticket!'
        }).setColor('Red')]
      })
    },
  })
}