import { DiscordComponent } from '@/discord/Components'

new DiscordComponent({
  customId: 'test',
  cache: 'cached',
  type: 'Button',
  async run (interaction) {
    await interaction.reply({
      content: 'Test'
    })
  }
})
