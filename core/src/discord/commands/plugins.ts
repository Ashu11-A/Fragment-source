import { Command, ButtonBuilder } from 'discord'
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type ApplicationCommandOptionChoiceData,
} from 'discord.js'
import { Plugin } from 'worker'

export default new Command({
  name: 'plugin',
  description: '[ ☢️ Core ] Gerir plugins carregados',
  dmPermission: false,
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'name',
      description: 'Nome do plugin (metadata.name)',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ],
  async autocomplete (interaction) {
    const response: ApplicationCommandOptionChoiceData[] = []

    switch (interaction.options.getFocused(true).name) {
    case 'name': {
      for (const plugin of Plugin.all.values()) {
        const pluginName = plugin.manager.metadata.name
        const version = plugin.manager.metadata.version
        const label = pluginName.replace(/^plugin-/, '')
        response.push({
          name: `${label} (${version})`,
          value: pluginName,
        })
      }
      break
    }
    }

    await interaction.respond(response)
  },
  async run (interaction) {
    if (!interaction.inCachedGuild()) return

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'Só administradores podem usar este comando.',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    const name = interaction.options.getString('name', true)
    const entry = [...Plugin.all.values()].find((e) => e.manager.metadata.name === name)

    if (entry === undefined) {
      await interaction.reply({
        content: 'Plugin não encontrado ou já foi descarregado.',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    const { manager, fileURL, pluginName } = entry
    const meta = manager.metadata

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [
        new EmbedBuilder({
          title: `Plugin: ${meta.name}`,
          description: meta.description ?? undefined,
          fields: [
            { name: 'Versão', value: meta.version, inline: true },
            { name: 'Origem', value: `\`${fileURL}\``, inline: false },
          ],
        }).setColor(0x5865f2),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder({
            customId: `pm/reload/${pluginName}`,
            label: 'Recarregar',
            style: ButtonStyle.Primary,
          }),
          new ButtonBuilder({
            customId: `pm/update/${pluginName}`,
            label: 'Atualizar',
            style: ButtonStyle.Secondary,
          }),
          new ButtonBuilder({
            customId: `pm/unload/${pluginName}`,
            label: 'Remover',
            style: ButtonStyle.Danger,
          })
        ),
      ],
    })
  },
})
