import { Event } from 'discord'
import Guild from '@/entity/Guild.entry.js'
import { database } from '@/utils/database'

/**
 * Crie o registro no banco de dados caso ele seja associado a um guild novo
 */
new Event({
  name: 'guildCreate',
  async run(guild) {

    if (await database.guild.findOne({ where: { guildId: guild.id } }) !== null) {
      console.log(`Servidor ${guild.name} está registrado no banco de dados!`)
      return
    }
    const result = await database.guild.save(await database.guild.create({ guildId: guild.id })) as Guild
    await database.config.save(await database.config.create({ guild: result }))
  },
})