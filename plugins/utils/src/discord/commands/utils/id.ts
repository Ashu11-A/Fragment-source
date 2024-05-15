import { Command } from '@/discord/base'
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder, codeBlock } from 'discord.js'

new Command({
  name: 'id',
  description: '[ 🪄 Utilidades ] Pega o id de algo',
  descriptionLocalizations: {
    'en-US': '[ 🪄 Utilidades ] Get the id of something'
  },
  dmPermission: false,
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'usuário',
      description: 'Escolha usuário que gostaria de saber o ID.',
      nameLocalizations: {
        'en-US': 'user'
      },
      descriptionLocalizations: {
        'en-US': 'Choose the user you would like to know the ID of.'
      },
      type: ApplicationCommandOptionType.User
    },
    {
      name: 'cargo',
      description: 'Escolha o cargo que gostaria de saber o ID.',
      nameLocalizations: {
        'en-US': 'role'
      },
      descriptionLocalizations: {
        'en-US': 'Choose the role you would like to know the ID of.'
      },
      type: ApplicationCommandOptionType.Role
    },
    {
      name: 'canal',
      description: 'Escolha o canal que gostaria de saber o ID.',
      nameLocalizations: {
        'en-US': 'channel'
      },
      descriptionLocalizations: {
        'en-US': 'Choose the channel you would like to know the ID of.'
      },
      type: ApplicationCommandOptionType.Channel
    }
  ],
  async run (interaction) {
    const { options } = interaction
    const user = options.getUser('usuário')
    const cargo = options.getRole('cargo')
    const canal = options.getChannel('canal')

    const embed = new EmbedBuilder({
      title: `Olá, ${interaction.user.username}!`,
      description: 'O resultado da sua consulta se encontra abaixo:'
    }).setColor('Green')
    
    if (user !== null) {
      embed.addFields({
        name: `User: ${user?.username}`,
        value: codeBlock(user.id)
      })
    }

    if (cargo !== null) {
      embed.addFields({
        name: `Role: ${cargo?.name}`,
        value: codeBlock(cargo.id)
      })
    }

    if (canal !== null) {
      embed.addFields({
        name: `Channel: ${canal?.name}`,
        value: codeBlock(canal.id)
      })
    }

    if ((embed.data.fields?.length ?? 0) > 0) {
      await interaction.reply({ ephemeral: true, embeds: [embed] })
      return
    }

    await interaction.reply({ content: 'Nenhuma opção foi expecificada...', ephemeral: true })
  }
})
