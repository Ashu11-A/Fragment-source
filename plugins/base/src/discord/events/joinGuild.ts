import { Event } from 'discord'
import { database } from '@/database'
import { Guild } from 'discord.js'

export default new Event({
  name: 'joinGuild',
  event: 'guildCreate',
  async run(guild: Guild) {
    if (await database.guild.findOne({ where: { guildId: guild.id } }) !== null) return
    await database.guild.save(await database.guild.create({ guildId: guild.id }))
  },
})

