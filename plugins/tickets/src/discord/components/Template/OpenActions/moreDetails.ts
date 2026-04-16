import { TicketBuilder } from '@/class/TicketBuilder.js'
import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { cacheSelectMenu } from '@/lib/openActionsCache.js'

export default createResponder({
  customId: 'MoreDetails',
  types: [ResponderType.Modal],
  async run (interaction) {
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
