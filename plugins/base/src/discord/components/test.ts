import type { PluginContext } from 'discord'

export default function register(ctx: PluginContext): void {
  ctx.component({
    customId: 'test',
    cache: 'cached',
    type: 'Button',
    async run(interaction) {
      await interaction.reply({ content: 'Test' })
    },
  })
}
