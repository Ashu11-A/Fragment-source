import { Database } from "@/controller/database"
import { Event } from "../base"
import Guild from "@/entity/Guild.entry"

const guildClass = new Database<Guild>({ table: 'Guild' })

new Event({
  name: 'guildCreate',
  async run(guild) {

    if (await guildClass.findOne({ where: { id: guild.id } }) !== null) {
      console.log(`Servidor ${guild.name} está registrado no banco de dados!`)
      return
    }
        
    await guildClass.save(await guildClass.create({ id: guild.id }))
  },
})