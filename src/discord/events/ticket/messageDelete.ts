import { db } from '@/app'
import { Event } from '@/discord/base'
import { type History } from '@/interfaces/Ticket'

new Event({
  name: 'messageDelete',
  async run ({ channelId, guildId, id }) {
    const history = await db.tickets.get(`${guildId}.tickets.${channelId}.history`) as History[] ?? []
    if (history.length <= 0) return
    const index = history.findIndex((log) => log.message.id === id)
    console.log(history)

    history[index] = {
      ...history[index],
      deleted: true
    }

    console.log(history)
    await db.tickets.set(`${guildId}.tickets.${channelId}.history`, history)
  }
})
