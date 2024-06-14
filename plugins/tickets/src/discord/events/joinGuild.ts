import { Event } from "@/discord/base/index.js"
import Guild from "@/entity/Guild.entry.js"
import { configDB, guildDB } from "@/functions/database.js"

/**
 * Crie o registro no banco de dados caso ele seja associado a um guild novo
 */
new Event({
  name: 'guildCreate',
  async run(guild) {

    if (await guildDB.findOne({ where: { guildId: guild.id } }) !== null) {
      console.log(`Servidor ${guild.name} está registrado no banco de dados!`)
      return
    }
    const result = await guildDB.save(await guildDB.create({ guildId: guild.id })) as Guild
    await configDB.save(await configDB.create({ guild: result }))
  },
})