import { ResponderType } from '@constatic/base'
import { createResponder } from 'discord'
import { runEditButton } from '@/lib/editTicket.js'

export default createResponder({
  customId: 'setColor',
  types: [ResponderType.Button],
  async run (interaction) {
    await runEditButton(interaction, 'setColor')
  },
})
