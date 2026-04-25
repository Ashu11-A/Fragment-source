import { database } from '@/database'
import { Event } from 'discord'
import { TextChannel } from 'discord.js'
  
export default new Event({
  name: 'voiceStateUpdate',
  event: 'voiceStateUpdate',
  async run(oldState, newState) {
    if (oldState.channel?.members.size === 0) {
      const guildData = await database.guild.find({ where: { guildId: newState.guild.id }, relations: { tickets: true } })
      const ticket = guildData[0].tickets.find((ticket) => ticket.voice?.id === oldState?.channelId)

      if (ticket === undefined) return
      if (ticket.voice?.messageId !== undefined) {
        const channel = await newState.guild.channels.fetch(ticket.channelId).catch(() => undefined) as TextChannel | undefined
        if (channel === undefined) return

        const message = await channel.messages.fetch(ticket.voice.messageId)
        await message.delete()
      }
      await oldState.channel?.delete()
    }
  },
})

