import { database } from '@/database'
import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { ResponderType } from '@constatic/base'
import { createResponder, Error } from 'discord'
import { PermissionsBitField } from 'discord.js'


  
export default createResponder({
  customId: 'EditSelectMenu',
  types: [ResponderType.StringSelect],
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply()
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) throw await new Error({ element: 'você', interaction }).forbidden().reply()

    const { message, values } = interaction
    const position = Number(values[0])
    const templateData = await database.template.findOne({ where: { messageId: message.id } })
    if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

    templateData.selects.splice(position, 1)
    await new TemplateBuilder({ interaction }).setData(templateData).setMode('debug').edit({ messageId: message.id }).then(() => interaction.deleteReply())
  },
})

