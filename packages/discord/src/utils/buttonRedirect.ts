import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type APIMessageComponentEmoji } from 'discord.js'

/**
 * Cria um botão de Redirecionamento
 */
export function buttonRedirect (options: {
guildId: string | null
channelId?: string
emoji?: APIMessageComponentEmoji
label: string
}): ActionRowBuilder<ButtonBuilder> {
  const { guildId, channelId, emoji, label } = options
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder({
      emoji,
      label,
      url: `https://discord.com/channels/${guildId}/${channelId}`,
      style: ButtonStyle.Link
    })
  )
}