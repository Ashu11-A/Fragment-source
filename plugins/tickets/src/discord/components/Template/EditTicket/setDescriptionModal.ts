import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { runEditModal } from '@/lib/editTicket.js'

export default createResponder({
  customId: 'setDescription',
  types: [ResponderType.Modal],
  async run (interaction) {
    await runEditModal(interaction, 'setDescription')
  },
})
