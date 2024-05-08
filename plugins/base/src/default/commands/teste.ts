import { Database } from '@/controller/Database'
import { DiscordCommand } from '@/discord'
import type User from '@/entity/User.entry'
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

    console.log(`Criando: ${JSON.stringify(user, null, 2)}`)

    const userSave = await database.save(user)

    console.log(`Salvando: ${JSON.stringify(userSave, null, 2)}`)

    const userFind = await database.find({ where: { firstName: 'a' }})
    
    console.log(`Achei isso aqui: ${JSON.stringify(userFind, null, 2)}`)

    const userDelete = await database.delete({ firstName: user.firstName })

    console.log(`Deletando isso: ${JSON.stringify(userDelete, null, 2)}`)

    await interaction.reply({
      content: 'Apenas um test'
    })
  }
})
