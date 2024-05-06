import { core, db } from '@/app'
import { CustomButtonBuilder } from '@/functions'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  codeBlock,
  type APIEmbed,
  type ButtonInteraction,
  type CacheType,
  type Message,
  type ModalSubmitInteraction
} from 'discord.js'
import { type PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes'
import { type ProductCartData, type cartData } from '@/interfaces'
import { getSettings } from '@/functions/getSettings'

interface UpdateCartType {
  interaction: ButtonInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ChatInputCommandInteraction<CacheType>
  cartData: cartData
}
export class UpdateCart {
  private readonly cartData
  private readonly interaction

  constructor ({ cartData, interaction }: UpdateCartType) {
    this.cartData = cartData
    this.interaction = interaction
  }

  public async embedAndButtons (options: {
    channel?: TextChannel // Somente para a criação de um novo carrinho
    message?: Message<boolean> | null
    paymentData?: PaymentResponse
    taxa?: number
  }): Promise<{
      main: {
        embeds: APIEmbed[]
        components: Array<ActionRowBuilder<ButtonBuilder>>
      }
      product: {
        embeds: APIEmbed[]
        components: Array<ActionRowBuilder<ButtonBuilder>>
      }
    }> {
    core.info('<--------\\\\ updateCart //-------->'.green)
    const startBuild = Date.now()
    const { interaction, cartData } = this
    const { message, channel, taxa } = options
    const { typeEmbed, products, properties } = cartData
    const { guildId, channelId } = interaction

    const paymentEmbeds: EmbedBuilder[] = []
    const productEmbeds: EmbedBuilder[] = []

    const paymentComponents = await this.typeButtons()
    const productComponents: Array<ActionRowBuilder<ButtonBuilder>> = []

    const cartDataUpdate = (await db.payments.get(
      `${guildId}.process.${channel?.id ?? channelId}`
    )) as cartData | undefined
    const mainMessageId = cartDataUpdate?.messageId
    const cartChannelId = cartDataUpdate?.channelId ?? cartData.channelId

    let setMessageId: string | undefined

    paymentEmbeds.push(
      ...(await this.generateInfoEmbed(taxa))
    )

    for (const product of products) {
      productEmbeds.push(this.generateProductEmbed({ product }))
      productComponents.push(
        await this.generateProductComponents({
          product,
          properties
        })
      )
    }

    const endBuild = Date.now()
    const timeSpent = (endBuild - startBuild) / 1000 + 's'
    core.info(`Build | Generate Components | ${timeSpent}`)

    // <-- Interações com o Discord -->
    const startInteraction = Date.now()
    if (
      message?.id === mainMessageId &&
      channelId === cartChannelId &&
      channel?.id !== channelId
    ) {
      // Caso venha de uma interação que já foi criada
      // if (typeEdit !== 'update') await message?.edit({ components: [] })
      const msg = await message?.edit({
        embeds: paymentEmbeds,
        components: paymentComponents
      })
      setMessageId = msg?.id
    } else if (cartChannelId !== undefined && mainMessageId !== undefined) {
      // Se a interação não vier de dentro do carrinho OU da embed principal
      const channelCart = await interaction.guild?.channels.fetch(
        cartChannelId
      )
      if (channelCart instanceof TextChannel) {
        const msg = await channelCart.messages.fetch(mainMessageId)
        await msg.edit({
          embeds: paymentEmbeds,
          components: paymentComponents
        })
        setMessageId = msg.id
      }
    } else if (channel !== undefined) {
      // Criação
      const msg = await channel.send({
        embeds: paymentEmbeds,
        components: paymentComponents
      })
      setMessageId = msg.id
    }
    if (setMessageId !== undefined) {
      await db.payments.set(
        `${guildId}.process.${channel?.id ?? channelId}.messageId`,
        setMessageId
      )
    }

    // Cria as embeds junto com os components de cada produto do carrinho
    if (typeEmbed === 0) {
      for (const [position, productEmbed] of productEmbeds.entries()) {
        const messageProductId = (await db.payments.get(
          `${guildId}.process.${
            channel?.id ?? channelId
          }.products.${position}.messageId`
        )) as string | undefined
        let messageId: string | undefined

        if (cartChannelId !== undefined && channel?.id !== channelId) {
          const channelCart = await interaction.guild?.channels.fetch(
            cartChannelId
          )
          if (channelCart instanceof TextChannel) {
            if (messageProductId !== undefined) {
              await channelCart.messages
                .fetch(String(messageProductId))
                .then(async (msg) => {
                  await msg.edit({
                    embeds: [productEmbed.toJSON()],
                    components: [productComponents[position].toJSON()]
                  })
                })
            } else {
              const msg = await channelCart?.send({
                embeds: [productEmbed.toJSON()],
                components: [productComponents[position].toJSON()]
              })
              messageId = msg.id
            }
          }
        } else {
          if (message !== undefined) {
            const msg = await message?.channel.send({
              embeds: [productEmbed.toJSON()],
              components: [productComponents[position].toJSON()]
            })
            if (msg !== undefined) messageId = msg.id
          } else if (channel !== undefined) {
            const msg = await channel?.send({
              embeds: [productEmbed.toJSON()],
              components: [productComponents[position].toJSON()]
            })
            messageId = msg.id
          }
        }
        if (messageId !== undefined) {
          await db.payments.set(
            `${guildId}.process.${
              channel?.id ?? channelId
            }.products.${position}.messageId`,
            messageId
          )
        }
      }
    }
    const endInteraction = Date.now()
    const timeSpentDiscord = (endInteraction - startInteraction) / 1000 + 's'
    core.info(`Build | Discord Interaction | ${timeSpentDiscord}`)
    core.info('<--------\\\\ updateCart //-------->'.red)

    return {
      main: {
        embeds: paymentEmbeds.map((embed) => embed.toJSON()),
        components: paymentComponents
      },
      product: {
        embeds: productEmbeds.map((embed) => embed.toJSON()),
        components: productComponents
      }
    }
  }

  public async generateInfoEmbed (taxa?: number): Promise<EmbedBuilder[]> {
    const { cartData, interaction } = this
    const { products, typeEmbed, typeRedeem, user } = cartData
    const { user: { id: userID }, guildId } = interaction
    const valorTotal =
      products.reduce(
        (allValue, product) => allValue + product.quantity * product.amount,
        0
      ) ?? 0
    const coinsTotal: number =
      products.reduce(
        (allCoins, product) =>
          allCoins + ((product?.coins ?? 0) * product.quantity ?? 0),
        0
      ) ?? 0
    const productTotal: number =
      products.reduce((allCount, product) => allCount + product.quantity, 0) ??
      0

    const taxTotal: number = products.reduce(
      (allTax, { amount }) => allTax + (amount * ((taxa ?? 0) / 100)), 0
    ) ?? 0

    console.log(taxTotal, valorTotal)
    const embeds: EmbedBuilder[] = []
    let title
    let description

    if (typeEmbed === 0) {
      title = 'Checkout & Quantidade.'
      description =
        'Selecione quantos produtos deseja no seu carrinho, e se quer aplicar algum cupom.'
    } else if (typeEmbed === 1) {
      title = 'Checkout & Envio.'
      description = `<@${userID}> Confira as informações sobre os produtos e escolha a forma que deseja receber seus créditos:`
    } else if (typeEmbed === 2) {
      title = 'Checkout & Tipo de pagamento.'
      description =
        'Confira as informações sobre os produtos e gere o link para o pagamento:'
    } else {
      title = 'Pagamento.'
      description = 'Realize o pagamento abaixo para adquirir o seu produto!'
    }

    embeds.push(
      new EmbedBuilder({
        title,
        description,
        fields: [
          { name: '📦 Produtos:', value: String(productTotal ?? 'Indefinido') },
          { name: '🛒 Valor Total', value: `R$${valorTotal}` },
          { name: '😓 Taxas', value: `R$${taxTotal}` }
        ]
      }).setColor('Blue')
    )
    if (coinsTotal > 0) {
      embeds[0].addFields({
        name: '🪙 Créditos totais:',
        value: `${coinsTotal}`
      })
    }
    if (typeEmbed > 1) { embeds[0].addFields({ name: '✉️ Método de envio:', value: typeRedeem ?? 'Não definido' }) }

    if (user !== undefined && typeEmbed !== 3 && typeEmbed !== 0) {
      embeds.push(
        new EmbedBuilder({
          title: 'Informações do Usuário',
          fields: [
            { name: '📧 E-mail:', value: user?.email ?? 'Indefinido' },
            { name: '🤝 Usuário:', value: user?.name ?? 'Indefinido' }
          ]
        }).setColor('Blue')
      )
    }

    if (typeEmbed === 2) {
      const {
        pix,
        debit_card: debit,
        credit_card: credit
      } = await db.payments.get(`${guildId}.config.taxes`)
      embeds.push(
        new EmbedBuilder({
          title: 'Taxas dos Métodos de pagamento:',
          fields: [
            { name: '💠 PIX:', value: (pix ?? '1') + '%', inline: false },
            {
              name: '💳 Cartão de Débito:',
              value: (debit ?? '1.99') + '%',
              inline: false
            },
            {
              name: '💳 Cartão de Crédito:',
              value: (credit ?? '4.98') + '%',
              inline: false
            }
          ]
        }).setColor('Blue')
      )
    }

    return embeds
  }

  public generateProductEmbed (options: {
    product: ProductCartData
  }): EmbedBuilder {
    const { product } = options
    const embed = new EmbedBuilder({
      title: product.name,
      fields: [
        {
          name: '💵 | Valor unitário:',
          value: `R$${Math.round(product.amount * 100) / 100 ?? 'Error'}`
        },
        { name: '📦 | Quantidade:', value: `${product.quantity ?? 'Error'}` }
      ],
      footer: { text: `Product ID: ${product.id}` }
    }).setColor('Blue')

    if (product.quantity > 1) {
      embed.addFields({
        name: '💰 | Valor total:',
        value: `R$${
          (Math.round(product.amount * 100) / 100) * product.quantity
        }`
      })
    }

    if (product.coins !== undefined && product.coins > 0) {
      embed.addFields({
        name: '🪙 | Créditos individuais:',
        value: String(product.coins),
        inline: product.quantity > 1
      })
      if (product.quantity > 1) {
        embed.addFields({
          name: '💰 | Créditos total:',
          value: String(product.coins * product.quantity),
          inline: true
        })
      }
    }

    if (product.pterodactyl !== undefined) {
      const { cpu, disk, time, /* port, */ ram } = product.pterodactyl
      const { Emojis } = getSettings()

      embed.setDescription(`
        ${cpu !== undefined ? `${Emojis?.cpu ?? '🖥️'} | CPU: ${cpu}` : ''}
        ${ram !== undefined ? `${Emojis?.ram ?? '🎟'} | Ram:  ${ram}` : ''}
        ${time !== undefined ? `${Emojis?.time ?? '⏳'} | Duração do plano: ${time}` : ''}
        ${disk !== undefined ? `${Emojis?.disk ?? '💿'} | Disco: ${disk}` : ''}
        `)
      // ${port !== undefined ? `${Emojis?.port} | Portas: ${port}` : ''}
    }

    return embed
  }

  public async generateProductComponents (options: {
    product: ProductCartData
    properties: Record<string, boolean> | undefined
  }): Promise<ActionRowBuilder<ButtonBuilder>> {
    const { properties, product } = options
    const start = Date.now()
    const components = new ActionRowBuilder<ButtonBuilder>()
    const productComponents = [
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Rem',
        disabled: ((product.quantity <= 1) || !product.isIncremental),
        emoji: { name: '➖' },
        style: ButtonStyle.Primary
      }),
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Add',
        disabled: !product.isIncremental,
        emoji: { name: '➕' },
        style: ButtonStyle.Primary
      }),
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Cupom',
        disabled: properties?.cupom,
        emoji: { name: '🎫' },
        style: ButtonStyle.Primary
      }),
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Remove',
        disabled: !product.isIncremental,
        emoji: { name: '✖️' },
        style: ButtonStyle.Danger
      })
    ]
    const end = Date.now()
    const timeSpent = (end - start) / 1000 + 's'
    core.info(`Build | Product Components | ${timeSpent}`)
    return components.setComponents(productComponents)
  }

  public async typeButtons (): Promise<Array<ActionRowBuilder<ButtonBuilder>>> {
    const { cartData: data } = this
    const { typeEmbed: type } = data
    const start = Date.now()

    const Secondary = [
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'DM',
        label: 'Mensagem via DM',
        emoji: { name: '💬' },
        style: ButtonStyle.Success,
        disabled: !(data.products.some((product) => product.isEphemeral) ?? false)
      })
    ]

    Secondary.push(
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Login',
        label: 'Login',
        emoji: { name: '🗝️' },
        style: ButtonStyle.Success,
        disabled: (data.products.some((product) => product.isEphemeral) ?? false)
      }),
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Registro',
        label: 'Registro',
        emoji: { name: '🔐' },
        style: ButtonStyle.Success,
        disabled: (data.products.some((product) => product.isEphemeral) ?? false)
      })
    )

    const Third = [
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Pix',
        label: 'PIX',
        emoji: { name: '💠' },
        style: ButtonStyle.Success
      }),
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'CardDebito',
        label: 'Cartão de Débito',
        emoji: { name: '💳' },
        style: ButtonStyle.Success,
        disabled: true
      }),
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'CardCredito',
        label: 'Cartão de Crédito',
        emoji: { name: '💳' },
        style: ButtonStyle.Success,
        disabled: true
      })
    ]

    const Payment = [
      new ButtonBuilder({
        label: 'Pagar',
        url: 'https://www.mercadopago.com.br/',
        style: ButtonStyle.Link
      }),
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Verify',
        label: 'Verificar Pagamento',
        emoji: { name: '✔️' },
        style: ButtonStyle.Success
      }),
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Cancelar',
        label: 'Cancelar',
        emoji: { name: '✖️' },
        style: ButtonStyle.Danger
      })
    ]

    const headerBar = [
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Before',
        label: 'Voltar',
        emoji: { name: '⬅️' },
        style: ButtonStyle.Secondary
      }),
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Next',
        label: 'Proximo',
        emoji: { name: '➡️' },
        style: ButtonStyle.Success
      }),
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'WTF',
        label: 'Saiba Mais 🔔',
        emoji: { name: '❔' },
        style: ButtonStyle.Primary
      }),
      new CustomButtonBuilder({
        type: 'Cart',
        customId: 'Cancelar',
        label: 'Cancelar',
        emoji: { name: '✖️' },
        style: ButtonStyle.Danger
      })
    ]

    const components: Array<ActionRowBuilder<ButtonBuilder>> = []

    components[0] = new ActionRowBuilder()
    if (type === undefined || type <= 2) {
      if (type === 0 || type === undefined) {
        components[0].setComponents(...headerBar)
      } else if (type === 1) {
        components[1] = new ActionRowBuilder()
        components[0].setComponents(...Secondary)
        components[1].setComponents(...headerBar)
      } else if (type === 2) {
        components[1] = new ActionRowBuilder()
        components[0].setComponents(...Third)
        components[1].setComponents(...headerBar)
      }
    } else if (type === 3) {
      components[0].setComponents(...Payment)
    }

    const actions: Record<
    string,
    (options: {
      value: CustomButtonBuilder
      customId: string
      typeEmbed?: number
      quantity?: number
      properties?: Record<string, boolean>
      typeRedeem?: 'CtrlPanel' | 'Pterodactyl' | 'DM'
    }) => void
    > = {
      Before: ({ value, typeEmbed }) => {
        if (typeEmbed === 0) value.setDisabled(true)
      },
      Next: ({ value, typeEmbed, typeRedeem }) => {
        if (
          typeEmbed !== undefined &&
          (typeEmbed >= 2 || (typeEmbed === 1 && typeRedeem === undefined))
        ) {
          value.setDisabled(true)
        }
      },
      WTF: ({ value, customId, typeEmbed, properties }) => {
        if (
          typeEmbed !== undefined &&
          properties?.[`${customId}_${typeEmbed}`] === true
        ) {
          value.setStyle(ButtonStyle.Secondary)
          value.setLabel('Saiba Mais')
        }
      },
      DM: ({ value, customId, typeRedeem, properties }) => {
        if (typeRedeem === 'DM' && properties?.[customId] === true) { value.setDisabled(true) }
      },
      CtrlPanel: ({ value, customId, typeRedeem, properties }) => {
        if (typeRedeem === 'CtrlPanel' && properties?.[customId] === true) { value.setDisabled(true) }
      }
    }

    const allValues = [...headerBar, ...Secondary]

    for (const value of allValues) {
      const { customId } = value
      if (customId === undefined) continue

      const { typeEmbed, typeRedeem, properties } = data ?? {}

      if (typeof actions[customId] === 'function') {
        actions[customId]({
          value,
          customId,
          typeEmbed,
          properties,
          typeRedeem
        })
      }
    }

    const end = Date.now()
    const timeSpent = (end - start) / 1000 + 's'
    core.info(`Build | Type Buttons | ${timeSpent}`)

    return components
  }

  public async displayData (options: {
    type?: 'editReply' | 'reply'
  }): Promise<void> {
    const { cartData, interaction } = this
    if (cartData === undefined || interaction === undefined) return
    const { type } = options
    const embed = new EmbedBuilder({
      title: '⚙️ | Setado com sucesso!',
      description:
        'Seus dados estão aqui, de forma limpa e justa.\nApos o pagamento/exclusão eles serão deletados.',
      fields: [
        {
          name: '📑 Dados:',
          value: codeBlock('json', JSON.stringify(cartData, null, 4))
        }
      ]
    }).setColor('Green')

    if (type === 'reply' || type === undefined) {
      await interaction.reply({
        ephemeral,
        embeds: [embed]
      })
    } else {
      await interaction.editReply({
        embeds: [embed]
      })
    }
  }
}