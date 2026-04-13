import { StringSelectMenuBuilder } from 'discord'
import type { PluginContext } from 'discord'
import { ActionRowBuilder, EmbedBuilder, MessageFlags, type SelectMenuComponentOptionData } from 'discord.js'

export default function register(ctx: PluginContext): void {
  ctx.component({
    customId: 'Panel',
    type: 'Button',
    async run(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      const embed = new EmbedBuilder({ description: '👇 | Escolha uma das opções abaixo:', footer: { text: 'Todas essas opções existem em slashcommands!' } }).setColor('Green')

      const optionsMenu: SelectMenuComponentOptionData[] = [
        { emoji: { name: '🔊' }, label: 'Criar call', value: 'CreateCall' },
        { emoji: { name: '👤' }, label: 'Adicionar usuário', value: 'AddUser' },
        { emoji: { name: '🗑️' }, label: 'Remover usuário', value: 'RemoveUser' },
        { emoji: { name: '💾' }, label: 'Salvar logs', value: 'Transcript' },
      ]

      if (interaction.memberPermissions?.has('Administrator')) {
        optionsMenu.push({ emoji: { name: '🗑️' }, label: 'Deletar ticket', value: 'Delete' })
      }

      const row = new ActionRowBuilder<StringSelectMenuBuilder>({
        components: [new StringSelectMenuBuilder({ placeholder: 'Escolha uma opção!', customId: 'PanelSelect', options: optionsMenu })]
      })

      await interaction.editReply({ embeds: [embed], components: [row] })
    },
  })
}
