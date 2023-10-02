import { db } from '@/app'
import { type ButtonInteraction, type CacheType, EmbedBuilder, PermissionsBitField, ChannelType, type OverwriteResolvable, type Collection } from 'discord.js'
import { updateCard } from './updateCard'
import { Discord } from '@/functions'

export async function createPayment (interaction: ButtonInteraction<CacheType>): Promise<void> {
  if (!interaction.inGuild()) return

  const { channelId, guild, guildId, user, message } = interaction
  const name = `🛒-${user.id}`
  const sendChannel = guild?.channels.cache.find((c) => c.name === name)

  if (sendChannel !== undefined) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder({
          title: `👋 Olá ${user.username}`,
          description: '☺️ | Você já tem um carrinho aberto!'
        })
          .setColor('Red')
      ],
      components: [
        await Discord.buttonRedirect({
          guildId,
          channelId: sendChannel.id,
          emoji: '🛒',
          label: 'Ir ao carrinho'
        })
      ]
    })
  } else {
    try {
      const data = await db.messages.get(`${guildId}.payments.${channelId}.messages.${message.id}`)
      const product: string = data?.embed?.title
      const status = await db.system.get(`${guildId}.status`)
      const paymentsConfig = await db.payments.get(`${guildId}.config`)

      const coins = data?.coins
      let amount = data?.price

      if (amount === undefined || parseFloat(amount?.replace(',', '.')) === 0) {
        await interaction.editReply({ content: '🤔 | Desculpe... mas esse produto não tem um valor.' })
        return
      }
      if (status?.systemPayments !== undefined && status.systemPayments === false) {
        await interaction.editReply({ content: '❌ | O sistema de pagamentos está desabilitado no momento!' })
        return
      }

      amount = amount.replace(',', '.')

      // Permissões de visualização do novo channel
      const permissionOverwrites = [
        {
          id: guildId,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: user.id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }
      ] as OverwriteResolvable[] | Collection<string, OverwriteResolvable>

      /* Cria o chat de Pagamento */
      const category = interaction.guild?.channels.cache.find(category => category.type === ChannelType.GuildCategory && category.id === paymentsConfig?.category)
      const paymentChannel = await guild?.channels.create({
        name,
        type: ChannelType.GuildText,
        topic: `Carrinho do(a) ${user.username}, ID: ${user.id}`,
        permissionOverwrites,
        parent: category?.id
      })

      const { embeds, components } = await updateCard.embedAndButtons({
        interaction,
        data: {
          product,
          amount,
          typeEmbed: 0,
          quantity: 1,
          coins
        }
      })

      if (paymentChannel !== undefined) {
        await paymentChannel.send({
          embeds,
          components
        })
          .then(async (msg) => {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder({
                  title: `👋Olá ${user.username}`,
                  description: '✅ | Seu carrinho foi aberto com sucesso!'
                })
                  .setColor('Green')
              ],
              components: [
                await Discord.buttonRedirect({
                  guildId,
                  channelId: paymentChannel.id,
                  emoji: '🛒',
                  label: 'Ir ao carrinho'
                })
              ]
            })
            await db.payments.set(`${guildId}.process.${msg.id}`, {
              userID: user.id,
              channelId: paymentChannel.id,
              messageId: msg.id,
              product,
              amount,
              coins,
              quantity: 1,
              typeEmbed: 0
            })
          })
          .catch(async (err) => {
            console.log(err)
            await paymentChannel.delete()
            await interaction.editReply({
              content: '❌ | Ocorreu um erro!'
            })
          })
      } else {
        await interaction.editReply({
          content: '❌ | Ocorreu um erro!'
        })
      }
    } catch (err) {
      console.log(err)
    }
  }
}
