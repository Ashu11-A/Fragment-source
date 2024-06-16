import { TemplateButtonBuilder } from "@/class/TemplateButtonBuilder.js"
import { Database } from "@/controller/database.js"
import { Component } from "@/discord/base/index.js"
import TemplateTable, { TypeTemplate } from "@/entity/Template.entry.js"
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

            setTimeout(() => interaction.deleteReply(), 5000)

            const buttonBuilder = new TemplateButtonBuilder()
            const components = buttonBuilder
              .setMode('debug')
              .setProperties(templateData.properties)
              .setSelects(templateData.selects)
              .setSystem(templateData.systems)
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