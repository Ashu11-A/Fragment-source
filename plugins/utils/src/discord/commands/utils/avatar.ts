import { Command } from '@/discord/base/index.js'
import { calculateImageSize, formatBytes } from '@/functions/format.js'
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from 'discord.js'

const arrayTamanho = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096]
const tamanhoChoices = arrayTamanho.map(size => ({
  name: String(size),
  value: String(size)
}))
new Command({
  name: 'avatar',
  description: '[ 🪄 Utilidades ] Mostra o avatar do usuário selecionado',
  dmPermission: false,
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'usuário',
      description: 'Selecionar usuário',
      type: ApplicationCommandOptionType.User,
      required: false
    },
    {
      name: 'tamanho',
      description: 'Tamanho da Imagem',
      type: ApplicationCommandOptionType.String,
      choices: tamanhoChoices,
      required: false
    }
  ],
  async run (interaction) {
    await interaction.deferReply()

    const { options } = interaction
    const user = options.getUser('usuário') ?? interaction.user
    const size: any = Number(options.getString('tamanho')) ?? 2048
    const img = user.avatarURL({ size })

    if (img === null) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: `Erro ao obter o avatar do usuário ${user.displayName}`
        }).setColor('Red')]
      })
      return
    }


    const tamanho = await calculateImageSize(String(img))

    const embed = new EmbedBuilder({
      title: 'Click aqui para baixar',
      description: `Tamanho da imagem: ${formatBytes(tamanho)}`,
      image: { url: img },
      url: img
    }).setColor('Random')

    await interaction.editReply({
      embeds: [embed]
    })
  }
})
