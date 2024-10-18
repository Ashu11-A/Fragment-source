import { Discord } from 'discord'
import { EmbedBuilder, PartialGroupDMChannel, type CacheType, type CommandInteraction } from 'discord.js'

 
export async function checkChannel(channelId: string, interaction: CommandInteraction<CacheType>) {
  const channel = await Discord.client.channels.fetch(channelId)
  const embed = new EmbedBuilder({ title: 'Channel fornecido é inválido!'}).setColor('Red')

  if (channel === null || !channel.isTextBased() && !channel.isDMBased()) {
    interaction[interaction.deferred ? 'editReply' : 'reply']({ embeds: [embed] })
    
    return false
  }

  if (channel instanceof PartialGroupDMChannel) return false
  return channel
}