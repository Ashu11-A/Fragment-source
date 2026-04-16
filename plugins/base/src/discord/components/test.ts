import { createResponder } from 'discord'
import { ResponderType } from '@constatic/base'

export default createResponder({
  customId: 'test',
  cache: 'cached',
  types: [ResponderType.Button],
  async run(interaction) {
    await interaction.reply({ content: 'Test' })
  },
})