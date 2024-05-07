import { Database } from '@/controller/Database'
import { DiscordCommand } from '@/discord'
import type User from '@/entity/User'
import { ApplicationCommandType } from 'discord.js'

new DiscordCommand({
  name: 'test',
  description: 'Apenas um teste',
  dmPermission: false,
  type: ApplicationCommandType.ChatInput,
  async run (interaction) {
    const database = new Database<User>({ table: 'User' })
    const user = await database.create({
      age: 1,
      firstName: 'a',
      lastName: 'a'
    })

    const userDelete = await database.delete({ firstName: user.firstName })

    console.log(userDelete)

    await interaction.reply({
      content: 'Apenas um test'
    })
  }
})
