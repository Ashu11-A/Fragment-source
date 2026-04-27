import { database } from '@/database'
import type Guild from '@/database/entity/Guild.entry.js'
import { Event } from 'discord'

export default new Event({
  name: 'guildCreate',
  event: 'guildCreate',
  async run(guild) {
    if (await database.guild.findOne({ where: { guildId: guild.id } }) !== null) return
    const result = await database.guild.save(await database.guild.create({ guildId: guild.id })) as Guild
    await database.config.save(await database.config.create({ guild: result }))
  },
})

