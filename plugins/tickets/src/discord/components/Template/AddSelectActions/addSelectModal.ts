import { database } from '@/database'
import { TemplateButtonBuilder } from '@/class/TemplateButtonBuilder.js'
import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { EmbedBuilder } from 'discord.js'
import { notFound } from '@/lib/addSelectShared.js'

export default createResponder({
  customId: 'AddSelect',
  types: [ResponderType.Modal],
  async run (interaction) {
    const title = interaction.fields.getTextInputValue('title')
    const emoji = interaction.fields.getTextInputValue('emoji')
    const description = interaction.fields.getTextInputValue('description')
    const templateData = await database.template.findOne({ where: { messageId: interaction.message?.id } })
    const buttonBuilder = new TemplateButtonBuilder()

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
        const components = buttonBuilder.setMode('debug').setProperties(templateData.properties).setSelects(templateData.selects).setType(templateData.type).setSystem(templateData.systems ?? []).render()
        await interaction.message?.edit({ components })
      })
      .catch(async () => {
        await interaction.editReply({ embeds: [new EmbedBuilder({ title: '❌ Ocorreu um erro ao tentar salvar as informações no database' }).setColor('Red')] })
      })
    setTimeout(() => interaction.deleteReply(), 2000)
  },
})
