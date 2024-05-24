import { Ticket } from "@/class/Ticket"
import { Database } from "@/controller/database"
import { Component } from "@/discord/base"
import Template, { TypeTemplate } from "@/entity/Template.entry"
import { EmbedBuilder } from "discord.js"

const template = new Database<Template>({ table: 'Template' })
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

            const components = await (new Ticket({ interaction })).genEditButtons({ messageId: interaction.message.id })

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