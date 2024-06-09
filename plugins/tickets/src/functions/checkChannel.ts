import { Discord } from "@/discord/base/index.js";
import { CacheType, CommandInteraction, DMChannel, EmbedBuilder, NewsChannel, PartialDMChannel, PrivateThreadChannel, PublicThreadChannel, StageChannel, TextChannel, VoiceChannel } from "discord.js";

export async function checkChannel(channelId: string, interaction: CommandInteraction<CacheType>): Promise<DMChannel | PartialDMChannel | NewsChannel | StageChannel | TextChannel | PrivateThreadChannel | PublicThreadChannel<any> | VoiceChannel | false> {
  const channel = await Discord.client.channels.fetch(channelId)
  const embed = new EmbedBuilder({ title: 'Channel fornecido é inválido!'}).setColor('Red')

  if (channel === null || !channel.isTextBased()) {
    interaction[interaction.deferred ? 'editReply' : 'reply']({ embeds: [embed] })
    return false
  }
  return channel
}