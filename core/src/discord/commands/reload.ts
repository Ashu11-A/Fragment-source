import { plugin } from '@/app'
import { Command } from 'discord'
import { ApplicationCommandType, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js'
import { basename } from 'path'

export default new Command({
  name: 'reload',
  description: '[ ☢️ Core ] Descarregar todos os plugins e voltar a importar os bundles em ./plugins',
  dmPermission: false,
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  type: ApplicationCommandType.ChatInput,
  async run (interaction) {
    if (!interaction.inCachedGuild()) return

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'Só administradores podem usar este comando.',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const results = await plugin.reloadAllFromDisk()

    if (results.length === 0) {
      await interaction.editReply({
        content:
          'Nenhum ficheiro `plugin-*.js` encontrado em `./plugins` (ou a pasta está vazia). ' +
          'Todos os plugins em memória foram descarregados.',
      })
      return
    }

    const lines = results.map(({ filePath, pluginName, error }) => {
      const label = basename(filePath)
      if (pluginName !== undefined) {
        return `✅ \`${label}\` → \`${pluginName}\``
      }
      return `❌ \`${label}\` — ${error ?? 'falhou (ver logs do core)'}`
    })

    await interaction.editReply({
      embeds: [
        new EmbedBuilder({
          title: 'Recarga completa (disco → memória)',
          description: lines.join('\n'),
        }).setColor(0x57f287),
      ],
    })
  },
})
