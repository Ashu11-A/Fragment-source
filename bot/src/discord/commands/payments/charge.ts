import { Command } from '@/discord/base'
import { createCart } from '@/discord/components/payments'
import { genv4 } from '@/functions'
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder, TextChannel } from 'discord.js'

new Command({
  name: 'cobrar',
  nameLocalizations:
    {
      'en-US': 'charge'
    },
  description: '[ 🛒 Pagamentos ] Cobrar um determinado valor',
  descriptionLocalizations: {
    'en-US': '[ 🛒 Payments ] Charge a certain amount'
  },
  dmPermission,
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'valor',
      description: 'Valor a ser cobrado',
      type: ApplicationCommandOptionType.Number,
      required
    },
    {
      name: 'user',
      description: 'Usuário a ser cobrado',
      type: ApplicationCommandOptionType.User,
      required
    }
  ],
  async run (interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ ephemeral })
    const { options, guild } = interaction
    const value = options.getNumber('valor', true)
    const user = options.getUser('user', true)

    const name = `🛒-${user.id}`
    const paymentChannel = guild.channels.cache.find((c) => c.name === name)
    if (paymentChannel instanceof TextChannel) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: `❌ | Usuário ${user.displayName ?? user.username}, já tem um carrinho, caso queira continuar, delete o carrinho atual.`
          }).setColor('Red')
        ]
      })
      return
    }

    await createCart(interaction, {
      product: {
        amount: value,
        quantity: 1,
        id: genv4(),
        name: `Cobrança para ${user.displayName ?? user.username}`,
        isIncremental: false,
        isEphemeral: true
      },
      user
    })
  }
})
