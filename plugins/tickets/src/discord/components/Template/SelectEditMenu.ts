import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { templateDB } from '@/utils/database'
import { Component, Error } from 'discord'
import { PermissionsBitField } from 'discord.js'

new Component({
  customId: 'EditSelectMenu',
  type: 'StringSelect',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply()
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) throw await new Error({ element: 'você', interaction }).forbidden().reply()
    
    const { message, values } = interaction
    const position = Number(values[0])

    const templateData = await templateDB.findOne({ where: { messageId: message.id } })
    if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

    templateData.selects.splice(position, 1)

    await new TemplateBuilder({ interaction })
      .setData(templateData)
      .setMode('debug')
      .edit({ messageId: message.id }).then(() => interaction.deleteReply())
  }
})