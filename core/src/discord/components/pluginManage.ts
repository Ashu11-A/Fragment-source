import { plugin } from '@/app'
import { Responder, ResponderType } from 'discord'
import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js'
import { Manager, Plugin } from 'worker'

export default new Responder({
  customId: 'core_pm/:action/:pluginName',
  types: [ResponderType.Button],
  async run (interaction, params) {
    if (!interaction.inCachedGuild()) return

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'Só administradores podem usar estas ações.',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    const { action, pluginName } = params
    const entry = Plugin.all.get(pluginName)

    if (entry === undefined) {
      await interaction.reply({
        content: 'Este plugin já não está carregado.',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    const { fileURL } = entry

    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    try {
      switch (action) {
      case 'reload': {
        const r = await plugin.register(fileURL)
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: r.ok ? 'Plugin recarregado' : 'Falha ao recarregar',
              description: r.ok
                ? `Plugin recarregado: \`${r.pluginName}\``
                : r.error,
            }).setColor(r.ok ? 'Green' : 'Red'),
          ],
        })
        break
      }
      case 'unload': {
        await plugin.unload(pluginName)
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: 'Plugin removido',
              description: 'Comandos e handlers deste plugin foram descarregados.',
            }).setColor('Orange'),
          ],
        })
        break
      }
      case 'update': {
        Manager.invalidateRemoteCache(fileURL)
        const r = await plugin.register(fileURL)
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: r.ok ? 'Plugin atualizado' : 'Falha ao atualizar',
              description: r.ok
                ? 'Cache remoto invalidado (se aplicável) e bundle recarregado.'
                : r.error,
            }).setColor(r.ok ? 'Green' : 'Red'),
          ],
        })
        break
      }
      default: {
        await interaction.editReply({ content: 'Ação desconhecida.' })
      }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: 'Erro',
            description: msg,
          }).setColor('Red'),
        ],
      })
    }
  },
})
