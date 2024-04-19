import { db } from '@/app'
import { Event } from '@/discord/base'

new Event({
  name: 'voiceStateUpdate',
  async run (oldState, newState) {
    const { guild } = newState
    const tickets = await db.tickets.get(`${guild.id}.tickets`) as Record<string, { voiceId: string }>
    const ticket = Object.values(tickets).find((ticket) => ticket?.voiceId === oldState?.channelId)

    console.log(ticket)
    if (ticket === undefined) return
    if (oldState.channel?.members.size === 0) await oldState.channel?.delete()
  }
})
