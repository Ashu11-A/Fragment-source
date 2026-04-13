import type { PluginContext } from 'discord'
import { EmbedBuilder } from 'discord.js'

export default function register(ctx: PluginContext): void {
  ctx.component({
    customId: 'Category',
    type: 'Button',
    async run(interaction) {
      await interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder({
          title: 'Recurso movido!',
          description: 'Use os comandos:\n`/ticket category add`\n`/ticket category rem`'
        }).setColor('Orange')]
      })
    },
  })
}
