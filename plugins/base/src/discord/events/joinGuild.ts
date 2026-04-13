import type { PluginContext } from 'discord'
import { createDatabase } from '@/utils/database.js'

export default function register(ctx: PluginContext): void {
  const database = createDatabase(ctx)

  ctx.event({
    name: 'guildCreate',
    async run(guild) {
      if (await database.guild.findOne({ where: { guildId: guild.id } }) !== null) {
        console.log(`Servidor ${guild.name} está registrado no banco de dados!`)
        return
      }
      await database.guild.save(await database.guild.create({ guildId: guild.id }))
    },
  })
}
