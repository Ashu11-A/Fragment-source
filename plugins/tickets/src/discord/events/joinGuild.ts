import { Database } from "@/controller/database.js"
import { Event } from "@/discord/base/index.js"
import Guild from "@/entity/Guild.entry.js"

const guildClass = new Database<Guild>({ table: 'Guild' })

new Event({
  name: 'guildCreate',
  async run(guild) {

    if (await guildClass.findOne({ where: { guildId: guild.id } }) !== null) {
      console.log(`Servidor ${guild.name} está registrado no banco de dados!`)
      return
    }
        
    await guildClass.save(await guildClass.create({ guildId: guild.id }))
  },
})