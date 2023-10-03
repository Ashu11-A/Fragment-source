import { db } from '@/app'
import mc from 'mercadopago'
import { EmbedBuilder, type ButtonInteraction, type CacheType, AttachmentBuilder, type APIEmbed, type ActionRowBuilder, type ButtonBuilder, type JSONEncodable } from 'discord.js'
import { PaymentFunction } from '../cardCollector/functions/collectorFunctions'
import { updateCard } from './updateCard'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class createPayment {
  /**
    * Método de pagamento
    */
  public static async embed (options: {
    interaction: ButtonInteraction<CacheType>
    method: 'pix' | 'debit_card' | 'credit_card'
  }): Promise<void> {
    const { interaction, method } = options
    const { message, guildId } = interaction
    const tax = await db.payments.get(`${guildId}.config.taxes.${method}`) ?? 0
    await PaymentFunction.NextOrBefore({ interaction, type: 'next', update: 'No' })
    const data = await db.payments.get(`${guildId}.process.${message.id}`)
    const amount = Number(data.amount) * data.quantity
    const amountTax = amount + (amount * (Number(tax) / 100))

    let embeds: Array<APIEmbed | JSONEncodable<APIEmbed>> = [] // Inicialize embeds como um array vazio
    let components: Array<ActionRowBuilder<ButtonBuilder>> = []

    const files: AttachmentBuilder[] = []

    if (method === 'pix') {
      await createPayment.pix({
        interaction,
        amountTax
      }).then(async ([unixTimestamp, payment, buf, id]) => {
        const { embeds: newEmbeds, components: newComponents } = await updateCard.embedAndButtons({
          data,
          interaction,
          paymentData: payment,
          taxa: tax
        })

        embeds = newEmbeds
        components = newComponents

        const attachment = new AttachmentBuilder(buf, { name: `${id}.png` })
        const pixEmbed = new EmbedBuilder({
          title: '✅ QR Code gerado com sucesso!',
          description: 'Aguardando pagamento. Após a verificação, os seus créditos serão entregues.',
          fields: [
            {
              name: '**📆 Pague até:** ',
              value: `<t:${unixTimestamp}:f>`
            }
          ],
          thumbnail: { url: 'https://cdn.discordapp.com/attachments/864381672882831420/1028227669650845727/loading.gif' },
          image: { url: `attachment://${id}.png` },
          footer: { text: `ID: ${id}` }
        }).setColor('Green')

        embeds.push(pixEmbed.toJSON())

        const pixCode = payment?.body?.point_of_interaction.transaction_data?.qr_code
        if (pixCode !== undefined) {
          const pixCodeEmbed = new EmbedBuilder({
            title: 'Pix copia e cola',
            description: pixCode,
            footer: { text: 'No celular, pressione para copiar.', iconURL: (interaction?.guild?.iconURL({ size: 64 }) ?? undefined) }
          })
          embeds.push(pixCodeEmbed.toJSON())
        }

        files.push(attachment)

        components[0].components[0].setURL(payment.body.point_of_interaction.transaction_data.ticket_url)
      }).catch(async (err) => {
        console.log(err)
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: '❌ | Ocorreu um erro, tente novamente...'
            }).setColor('Red')
          ]
        })
      })
    } else if (method === 'debit_card' || method === 'credit_card') {
      await createPayment.card({
        interaction,
        method,
        amountTax
      }).then(async ([unixTimestamp, payment]) => {
        const { embeds: newEmbeds, components: newComponents } = await updateCard.embedAndButtons({
          data,
          interaction,
          paymentData: payment,
          taxa: tax
        })

        embeds = newEmbeds
        components = newComponents

        const cardEmbed = new EmbedBuilder({
          title: '✅ URL de pagamento gerado com sucesso!',
          description: 'Aguardando pagamento. Após a verificação, os seus créditos serão entregues.',
          thumbnail: { url: 'https://cdn.discordapp.com/attachments/864381672882831420/1028227669650845727/loading.gif' },
          fields: [
            {
              name: '**📆 Pague até:** ',
              value: `<t:${unixTimestamp}:f>`
            }
          ]
        }).setColor('Green')

        embeds.push(cardEmbed.toJSON())
        components[0].components[0].setURL(payment.body.init_point)
      }).catch(async (err) => {
        console.log(err)
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: '❌ | Ocorreu um erro, tente novamente...'
            }).setColor('Red')
          ]
        })
      })
    }
    const clearData = { components: [], embeds: [], files: [] }
    await message.edit({
      ...clearData,
      embeds,
      components,
      files
    })
  }

  /**
   * Criar pagamento por PIX
   */
  public static async pix (options: {
    interaction: ButtonInteraction<CacheType>
    amountTax: number
  }): Promise<any[]> {
    const { interaction, amountTax } = options
    const { guildId } = interaction
    const token = await db.payments.get(`${guildId}.config.mcToken`)

    mc.configure({
      access_token: token
    })

    const paymentData = {
      payer: {
        first_name: interaction.user.username,
        last_name: interaction.user.id,
        email: `${interaction.user.id}@gmail.com`
      },
      description: `Pagamento Via Discord | ${interaction.user.username} | R$${(amountTax).toFixed(2)}`,
      transaction_amount: amountTax,
      payment_method_id: 'pix',
      installments: 0
    }

    const payment = await mc.payment.create(paymentData)

    const base64Img = payment.body.point_of_interaction.transaction_data.qr_code_base64
    const buf = Buffer.from(base64Img, 'base64')
    const id = payment.body.id

    const dateStr = payment.body.date_of_expiration
    const expirationDate = new Date(dateStr)
    expirationDate.setMinutes(expirationDate.getMinutes())
    const unixTimestamp = Math.floor(expirationDate.getTime() / 1000)

    return [unixTimestamp, payment, buf, id]
  }

  /**
   * Criar pagamento por Cartão
   */
  public static async card (options: {
    interaction: ButtonInteraction<CacheType>
    method: 'debit_card' | 'credit_card'
    amountTax: number
  }): Promise<any[]> {
    const { interaction, method, amountTax } = options
    const { guildId } = interaction
    const data = await db.payments.get(`${guildId}.config`)
    const { mcToken, ipn } = data
    const date = new Date()
    date.setDate(date.getDate() + 3)
    const isoDate = date.toISOString()

    mc.configure({
      access_token: mcToken
    })

    const payment = await mc.preferences.create({
      payer: {
        name: interaction.user.username,
        surname: interaction.user.id,
        email: `${interaction.user.id}@gmail.com`
      },
      items: [
        {
          title: 'Pagamento Via Discord',
          description: `${interaction.user.username} | R$${amountTax.toFixed(2)}`,
          unit_price: amountTax,
          quantity: 1,
          currency_id: 'BRL'
        }
      ],
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'bank_transfer' }],
        excluded_payment_methods: [
          { id: method }
        ],
        installments: 1
      },
      notification_url: ipn ?? undefined,
      metadata: {
        user_id: interaction.user.id,
        amountTax,
        mcToken
      },
      date_of_expiration: isoDate
    })

    const dateStr = payment.body.date_of_expiration
    const expirationDate = new Date(dateStr)
    expirationDate.setMinutes(expirationDate.getMinutes())
    const unixTimestamp = Math.floor(expirationDate.getTime() / 1000)

    return [unixTimestamp, payment]
  }
}
