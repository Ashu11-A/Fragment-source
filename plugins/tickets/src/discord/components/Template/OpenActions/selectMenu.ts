import { database } from '@/database'
import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { ResponderType } from '@constatic/base'
import { ActionDrawer, createResponder, Error, ModalBuilder } from 'discord'
import { MessageFlags, PermissionsBitField, TextInputBuilder, TextInputStyle } from 'discord.js'
import { cacheSelectMenu } from '@/lib/openActionsCache.js'

export default createResponder({
  customId: 'SelectMenu',
  types: [ResponderType.StringSelect],
  async run (interaction) {
    if (!interaction.inCachedGuild()) return
    const { values, message, user } = interaction
    const select = values[0]

    if (select === 'config') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator ?? false)) throw await new Error({ element: 'você', interaction }).forbidden().reply()
      await new TemplateBuilder({ interaction }).setMode('debug').edit({ messageId: message.id })
      await interaction.deleteReply()
      return
    }

    const templateData = await database.template.findOne({ where: { messageId: message.id } })
    if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

    const typeTicket = templateData?.selects[Number(select)]
    if (typeTicket === undefined) throw await new Error({ element: 'select', interaction }).notFound({ type: 'Database' }).reply()

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
