import { Responder, ResponderType } from 'discord'

export default new Responder({
  customId: 'test',
  cache: 'cached',
  types: [ResponderType.Button],
  async run(interaction) {
    await interaction.reply({ content: 'Test' })
  },
})