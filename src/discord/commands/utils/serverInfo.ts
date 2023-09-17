import { db } from '@/app'
import { Command } from '@/discord/base'
import { ApplicationCommandType, ChannelType, EmbedBuilder } from 'discord.js'

new Command({
  name: 'serverinfo',
  description: '[ 🪄 Utilidades ] Mostra informações sobre o servidor',
  dmPermission,
  type: ApplicationCommandType.ChatInput,
  async run (interaction) {
    const site = await db.guilds.get(`${interaction.guildId}.urls.site`)
    const loja = await db.guilds.get(`${interaction.guildId}.urls.loja`)
    const iconURL = interaction?.guild?.iconURL({ size: 64 }) ?? undefined
    const embed = new EmbedBuilder()
      .setAuthor({ iconURL, name: interaction.guild?.name as string })
      .setColor('Blurple')
      .addFields(
        { name: 'Dono', value: `<@${interaction.guild?.ownerId}>`, inline: true },
        {
          name: 'Membros',
          value: String(interaction.guild?.memberCount),
          inline: true
        },
        {
          name: 'Cargos',
          value: String(interaction.guild?.roles.cache.size),
          inline: true
        },
        {
          name: 'Categorias',
          value: String(interaction.guild?.channels.cache.filter((channels) => channels.type === ChannelType.GuildCategory).size),
          inline: true
        },
        {
          name: 'Canais de texto',
          value: String(interaction.guild?.channels.cache.filter((channel) => channel.type === ChannelType.GuildText).size),
          inline: true
        },
        {
          name: 'Canais de Áudio',
          value: String(interaction.guild?.channels.cache.filter((channel) => channel.type === ChannelType.GuildVoice).size),
          inline: true
        }
      )
      .setFooter({
        text: `ID: ${interaction.channelId} | Servidor Criado em ${
        interaction.guild?.createdAt.toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}`
      })

    if (iconURL !== undefined) {
      embed.setThumbnail(interaction.guild?.iconURL() as string)
    }
    if (site !== undefined) {
      embed.addFields('Site', site)
    }
    if (loja !== undefined) {
      embed.addFields('Loja', loja)
    }

    await interaction.reply({
      ephemeral: true,
      embeds: [embed]
    })
  }
})
