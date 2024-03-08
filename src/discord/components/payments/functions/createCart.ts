import { db } from '@/app'
import { Discord, genv4 } from '@/functions'
import { type ProductCartData, type cartData, type productData } from '@/interfaces'
import { ButtonInteraction, ChannelType, EmbedBuilder, type Message, PermissionsBitField, TextChannel, type CacheType, type ChatInputCommandInteraction, type Collection, type OverwriteResolvable, type User } from 'discord.js'
import { UpdateCart } from './updateCart'

export async function createCart (interaction: ButtonInteraction<CacheType> | ChatInputCommandInteraction<CacheType>, ephemeralCard?: { product: ProductCartData, user: User }): Promise<void> {
  if (!interaction.inGuild() || !interaction.inCachedGuild()) return
  const { channelId, guild, guildId } = interaction

  let productData: productData | ProductCartData | undefined
  let productName: string | undefined
  let productAmount: number | undefined
  let productMessage: Message | undefined
  let isIncremental: boolean = true
  let isEphemeral: boolean = false
  let client: User | undefined

  if (interaction instanceof ButtonInteraction) {
    const { message, user } = interaction
    productMessage = message
    productData = await db.messages.get(`${guildId}.payments.${channelId}.messages.${message.id}`) as productData
    productName = productData?.embed?.title ?? 'NoName'
    productAmount = productData?.price
    client = user
  } else if (ephemeralCard !== undefined) {
    const { product, user } = ephemeralCard
    productData = product
    productName = product?.name ?? 'NoName'
    productAmount = product.amount
    isIncremental = product.isIncremental
    isEphemeral = product.isEphemeral
    client = user
  }

  if (productData === undefined || productName === undefined || client === undefined) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder({
          title: '❌ | Ocorreu um erro ao tentar definir as propriedades do produto!'
        }).setColor('Red')
      ]
    })
    return
  }

  const status = await db.system.get(`${guildId}.status`)
  const paymentsConfig = await db.payments.get(`${guildId}.config`)

  const name = `🛒-${client.id}`
  const sendChannel = guild.channels.cache.find((c) => c.name === name)

  // Verificar se o produto está configurado
  if (
    ephemeralCard === undefined &&
    productData?.properties?.SetCtrlPanel === undefined &&
    productData?.properties?.SetEstoque === undefined &&
    productData?.properties?.SetPterodactyl === undefined
  ) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder({
          title: 'Nenhum método de envio foi configurado.'
        }).setColor('Aqua')
      ]
    })
    return
  }

  if (productAmount === undefined) {
    await interaction.editReply({ content: '🤔 | Desculpe... mas esse produto não tem um valor.' })
    return
  }

  const { coins, role, id, pterodactyl } = productData

  if (status?.Payments !== undefined && status.Payments === false) {
    await interaction.editReply({ content: '❌ | O sistema de pagamentos está desabilitado no momento!' })
    return
  }

  // Verifica se o carrinho ja existe
  if (sendChannel !== undefined && sendChannel instanceof TextChannel) {
    try {
      const cartData = await db.payments.get(`${guildId}.process.${sendChannel.id}`) as cartData
      // <-- Validar se o resgate é Pterodactyl ou Ctrlpanel, e se nn há conflito -->
      let disablePtero = false
      let disableCTRL = false
      let disableEphemeral = false

      for (const product of cartData.products) {
        if ((product.pterodactyl !== undefined)) {
          disableCTRL = true
        } else if ((product.coins !== undefined)) {
          disablePtero = true
        } else if (product.isEphemeral) {
          disableEphemeral = true
        }
      }

      if ((productData.pterodactyl !== undefined)) {
        disableCTRL = true
      }
      if ((productData.coins !== undefined)) {
        disablePtero = true
      }

      if (disableEphemeral) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: '❌ | Você tem uma cobrança atualmente, não é possivel adicionar mais produtos.'
            }).setColor('Red')
          ]
        })
        return
      }

      if (disablePtero && disableCTRL) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: 'Você tem produtos com diferentes características de entrega, no momento isso não é permitido!'
            }).setColor('Red')
          ]
        })
        return
      }

      if (cartData === undefined) {
        await sendChannel.delete()
        await createCart(interaction)
      } else if (cartData.products.some((product) => product.id === productMessage?.id)) {
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: '🤚 Desculpe, mas esse item já está no seu carrinho!'
          }).setColor('Red')]
        })
        return
      }
      await db.payments.push<ProductCartData>(`${guildId}.process.${sendChannel.id}.products`, {
        id,
        name: productName,
        amount: productAmount,
        quantity: 1,
        coins,
        pterodactyl,
        isIncremental,
        isEphemeral
      })
      const cartBuilder = new UpdateCart({ interaction, cartData: await db.payments.get(`${guildId}.process.${sendChannel.id}`) as cartData })
      await cartBuilder.embedAndButtons({
        channel: sendChannel,
        message: productMessage
      })
      await interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: `📦 | Produto: ${productName} adicionado ao carrinho com sucesso!`
          })
            .setColor('Green')
        ],
        components: [
          await Discord.buttonRedirect({
            guildId,
            channelId: sendChannel.id,
            emoji: { name: '🛒' },
            label: 'Ir ao carrinho'
          })
        ]
      })
    } catch (err) {
      console.log(err)
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ | Ocorreu um erro ao abrir o carrinho!'
        }).setColor('Red')]
      })
    }
  } else {
    try {
      // Permissões de visualização do novo channel
      const permissionOverwrites = [
        {
          id: guildId,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: client.id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }
      ] as OverwriteResolvable[] | Collection<string, OverwriteResolvable>

      /* Cria o chat de Pagamento */
      const category = guild.channels.cache.find(category => category.type === ChannelType.GuildCategory && category.id === paymentsConfig?.category)
      const paymentChannel = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        topic: `Carrinho do(a) ${client.username}, ID: ${client.id}`,
        permissionOverwrites,
        parent: category?.id
      })

      const data: any = await db.payments.set<cartData>(`${guildId}.process.${paymentChannel.id}`, {
        UUID: genv4(),
        userID: client.id,
        channelId: paymentChannel.id,
        role,
        typeEmbed: 0,
        products: [
          {
            id,
            name: productName,
            amount: productAmount,
            quantity: 1,
            coins,
            pterodactyl,
            isIncremental,
            isEphemeral
          }
        ]
      })

      const cartBuilder = new UpdateCart({ interaction, cartData: data.process[paymentChannel.id] })
      const { main: { embeds } } = await cartBuilder.embedAndButtons({ channel: paymentChannel })

      if (paymentChannel !== undefined && embeds !== undefined) {
        const components = [
          await Discord.buttonRedirect({
            guildId,
            channelId: paymentChannel.id,
            emoji: { name: '🛒' },
            label: 'Ir ao carrinho'
          })
        ]

        if (ephemeralCard !== undefined) {
          await client.send({
            embeds: [
              new EmbedBuilder({
                title: `👋 Olá ${client.displayName ?? client.username}!`,
                description: `Foi aberto uma cobrança de R$${productAmount} no servidor ${guild.name}.`,
                footer: { text: `Não reconhece esse pedido? fale com ${interaction.user.username}` }
              }).setColor('Green')
            ],
            components
          })
          await interaction.editReply({
            embeds: [
              new EmbedBuilder({
                title: `Mandei uma mensagem de cobrança na DM do usuário: ${client.username}, ID: ${client.id}.`
              }).setColor('Purple')
            ]
          })
        } else {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder({
                title: `👋Olá ${client.username}`,
                description: '✅ | Seu carrinho foi aberto com sucesso!'
              }).setColor('Green')
            ],
            components
          })
        }
      } else {
        await interaction.editReply({ content: '❌ | Ocorreu um erro!' })
        await paymentChannel?.delete()
        await db.payments.delete(`${guildId}.process.${paymentChannel.id}`)
      }
    } catch (err) {
      console.log(err)
    }
  }
}
