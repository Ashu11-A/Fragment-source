import { TicketBuilder } from '@/class/TicketBuilder.js'
import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { userSelect } from '@/lib/openActionsCache.js'

export default createResponder({
  customId: 'ModalOpen',
  types: [ResponderType.Modal],
  async run (interaction) {
    if (!interaction.inCachedGuild()) return
    const { fields, user } = interaction
    const nickname = fields.getTextInputValue('nickname')
    const platform = fields.getTextInputValue('platform')
    const description = fields.getTextInputValue('description')
    const cache = userSelect.get(user.id)
    userSelect.delete(user.id)

    const builder = new TicketBuilder({ interaction }).setOwner(user.id).setDescription(description)
    if (cache !== undefined) { builder.setCategory(cache.category); builder.setTemplateId(cache.templateId) }
    console.log(`Nick: ${nickname}, Plataforma: ${platform}, Descrição: ${description}`)
    await builder.create()
  },
})
