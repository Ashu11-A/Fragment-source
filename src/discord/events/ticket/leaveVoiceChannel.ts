import { db } from '@/app'
import { Event } from '@/discord/base'
import { type Ticket } from '@/interfaces/Ticket'
import { type TextChannel } from 'discord.js'

new Event({
  name: 'voiceStateUpdate',
  async run (oldState, newState) {
    const { guild } = newState
    const tickets = await db.tickets.get(`${guild.id}.tickets`) as undefined | Record<string, Ticket>
    if (tickets === undefined) return

    const ticket = Object.values(tickets).find((ticket) => ticket.voice?.id === oldState?.channelId)

    if (ticket === undefined) return
    if (oldState.channel?.members.size === 0) {
      if (ticket.voice?.messageId !== undefined) {
        const channel = newState.guild.channels.cache.find((channel) => channel.id === ticket.channelId) as TextChannel
        const message = await channel.messages.fetch(ticket.voice.messageId)
        await message.delete()
      }
      await oldState.channel?.delete()
    }
  }
})
