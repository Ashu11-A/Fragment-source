import { database } from '@/utils/database'
import { Command } from 'discord'
import { ApplicationCommandType } from 'discord.js'

new Command({
  name: 'test',
  description: 'Apenas um teste',
  dmPermission: false,
  type: ApplicationCommandType.ChatInput,
  async run (interaction) {
    const user = await database.user.create({
      age: 1,
      firstName: 'a',
      lastName: 'a'
    })

    console.log(`Criando: ${JSON.stringify(user, null, 2)}`)

    const userSave = await database.user.save(user)

    console.log(`Salvando: ${JSON.stringify(userSave, null, 2)}`)

    const userFind = await database.user.find({ where: { firstName: 'a' }})
    
    console.log(`Achei isso aqui: ${JSON.stringify(userFind, null, 2)}`)

    const userDelete = await database.user.delete({ firstName: user.firstName })

    console.log(`Deletando isso: ${JSON.stringify(userDelete, null, 2)}`)

    await interaction.reply({
      content: 'Apenas um test'
    })
  }
})
