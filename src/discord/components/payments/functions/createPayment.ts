import { db } from '@/app'
import {
  EmbedBuilder,
  type ButtonInteraction,
  type CacheType,
  AttachmentBuilder,
  type APIEmbed,
  type ActionRowBuilder,
  type ButtonBuilder,
  type JSONEncodable
} from 'discord.js'
import { UpdateCart } from './updateCart'
import axios from 'axios'
import { getSettings } from '@/functions/getSettings'
import { PaymentFunction } from '../cart/functions/cartCollectorFunctions'
import { type cartData, type infoPayment } from '@/interfaces'
import MercadoPagoConfig, { Payment } from 'mercadopago'

export async function createPayment (options: {
  interaction: ButtonInteraction<CacheType>
  method: 'pix' | 'debit_card' | 'credit_card'
}): Promise<void> {
  const { interaction, method } = options
  if (!interaction.inGuild()) return
  const { message, guildId, user, channelId } = interaction
  const tax = await db.payments.get(`${guildId}.config.taxes.${method}`)
  const cartData = (await db.payments.get(
    `${guildId}.process.${channelId}`
  )) as cartData
  const amount: number =
    cartData.products.reduce(
      (allValue, product) =>
        allValue +
        (typeof product.cupom?.porcent === 'number'
          ? product.amount - (product.amount * product.cupom.porcent) / 100
          : product.amount) *
          product.quantity,
      0
    ) ?? 0
  const amountTax =
    Math.round((amount + amount * (Number(tax) / 100)) * 100) / 100 // Pode receber numeros quebrados por isso do "* 100) / 100"
  const { mpToken, ipn } = await db.payments.get(`${guildId}.config`)
  const PaymentBuilder = new PaymentFunction({ interaction })

  let embeds: Array<APIEmbed | JSONEncodable<APIEmbed>> = [] // Inicialize embeds como um array vazio
  let components: Array<ActionRowBuilder<ButtonBuilder>> = []
  let err: boolean = false
  const embedErr = new EmbedBuilder({
    title: `👋 Olá,  ${user.username}`,
    description:
      'Pedimos desculpas, mas ocorreu um erro ao tentar processar seu pedido de pagamento. Chame um administrador para resolver esse problema!'
  }).setColor('Red')

  const files: AttachmentBuilder[] = []

  if (method === 'pix') {
    try {
      const date = new Date()
      date.setDate(date.getDate() + 1)
      const isoDate = date.toISOString()
      const client = new MercadoPagoConfig({ accessToken: mpToken })
      const paymentData = await new Payment(client).create({
        body: {
          payer: {
            first_name: user.username,
            last_name: user.id,
            email: `${user.id}@gmail.com`
          },
          description: `Pagamento Via Discord | ${user.username} | R$${(amountTax).toFixed(2)}`,
          transaction_amount: Math.round(amountTax * 100) / 100,
          payment_method_id: 'pix',
          installments: 0
        }
      })

      const dateStr = paymentData?.date_of_expiration ?? isoDate
      const expirationDate = new Date(dateStr)
      expirationDate.setMinutes(expirationDate.getMinutes())
      const unixTimestamp = Math.floor(expirationDate.getTime() / 1000)
      const id = paymentData.id

      let buffer: undefined | Buffer

      if (paymentData?.point_of_interaction?.transaction_data?.qr_code_base64 !== undefined) {
        buffer = Buffer.from(paymentData.point_of_interaction.transaction_data.qr_code_base64, 'base64')
      }

      await PaymentBuilder.NextOrBefore({ type: 'next', update: 'No' })

      const cartBuilder = new UpdateCart({
        interaction,
        cartData: { ...cartData, typeEmbed: (cartData.typeEmbed += 1) }
      })
      const UpdateCartData = await cartBuilder.embedAndButtons({
        paymentData,
        taxa: tax ?? 1
      })
      const newEmbeds = UpdateCartData?.main.embeds
      const newComponents = UpdateCartData?.main.components
      if (newEmbeds === undefined || newComponents === undefined) return

      await db.payments.set(`${guildId}.process.${channelId}.paymentId`, id)

      embeds = newEmbeds
      components = newComponents

      if (buffer !== undefined) files.push(new AttachmentBuilder(buffer, { name: `${id}.png` }))

      const pixEmbed = new EmbedBuilder({
        title: '✅ QR Code gerado com sucesso!',
        description:
          'Aguardando pagamento. Após a verificação, os seus créditos serão entregues.',
        fields: [
          {
            name: '**📆 Pague até:** ',
            value: `<t:${unixTimestamp}:f>`
          }
        ],
        thumbnail: {
          url: 'https://cdn.discordapp.com/attachments/864381672882831420/1028227669650845727/loading.gif'
        },
        image: { url: `attachment://${id}.png` },
        footer: { text: `ID: ${id}` }
      }).setColor('Green')

      embeds.push(pixEmbed.toJSON())

      const pixCode = paymentData?.point_of_interaction?.transaction_data?.qr_code
      if (pixCode !== undefined) {
        const pixCodeEmbed = new EmbedBuilder({
          title: 'Pix copia e cola',
          description: pixCode,
          footer: {
            text: 'No celular, pressione para copiar.',
            iconURL: interaction?.guild?.iconURL({ size: 64 }) ?? undefined
          }
        }).setColor('Green')
        embeds.push(pixCodeEmbed.toJSON())
      }

      components[0].components[0].setURL(paymentData?.point_of_interaction?.transaction_data?.ticket_url ?? 'https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/possible-errors')
    } catch (error) {
      console.log(error)
      err = true
    }
  } else if (method === 'debit_card' || method === 'credit_card') {
    const dataCart: infoPayment = {
      userName: user.username,
      userId: user.id,
      mpToken,
      channelId,
      guildId,
      UUID: cartData.UUID as string,
      price: amountTax,
      method,
      ipn
    }
    const paymentCreate = await axios.post(
      `http://${getSettings().Express.ip}:${getSettings().Express.Port}/payment/create/card`,
      dataCart
    )

    if (paymentCreate.status === 200) {
      const { paymentData, unixTimestamp } = paymentCreate.data
      console.log(paymentData)

      await PaymentBuilder.NextOrBefore({ type: 'next', update: 'No' })

      const cartBuilder = new UpdateCart({
        interaction,
        cartData: { ...cartData, typeEmbed: (cartData.typeEmbed += 1) }
      })
      const UpdateCartData = await cartBuilder.embedAndButtons({
        paymentData,
        taxa: method === 'debit_card' ? tax ?? 2 : tax ?? 5
      })
      const newEmbeds = UpdateCartData?.main.embeds
      const newComponents = UpdateCartData?.main.components
      if (newEmbeds === undefined || newComponents === undefined) return

      embeds = newEmbeds
      components = newComponents

      const cartEmbed = new EmbedBuilder({
        title: '✅ URL de pagamento gerado com sucesso!',
        description:
          'Aguardando pagamento. Após a verificação, os seus créditos serão entregues.',
        thumbnail: {
          url: 'https://cdn.discordapp.com/attachments/864381672882831420/1028227669650845727/loading.gif'
        },
        fields: [
          {
            name: '**📆 Pague até:** ',
            value: `<t:${unixTimestamp}:f>`
          }
        ]
      }).setColor('Green')

      embeds.push(cartEmbed.toJSON())
      components[0].components[0].setURL(paymentData.init_point)
    }
  }
  const clearData = { components: [], embeds: [], files: [] }
  if (embeds.length === 0 || components.length === 0 || err) {
    await interaction.editReply({
      embeds: [embedErr]
    })
    return
  }
  await message.edit({
    ...clearData,
    embeds,
    components,
    files
  })
}
