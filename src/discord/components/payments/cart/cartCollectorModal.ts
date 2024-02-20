import { core, db } from '@/app'
import { UpdateCart } from '@/discord/components/payments'
import { validarEmail } from '@/functions'
import { EmbedBuilder, codeBlock, type CacheType, type ModalSubmitInteraction } from 'discord.js'
import { getModalData } from './functions/getModalData'
import { PaymentFunction } from './functions/cartCollectorFunctions'
import { CtrlPanel } from '@/classes/ctrlPanel'

export default async function cartCollectorModal (options: {
  interaction: ModalSubmitInteraction<CacheType>
  key: string
}): Promise<void> {
  const { interaction, key } = options
  if (!interaction.inGuild()) return

  const { guildId, user, channel, message, fields, channelId } = interaction
  const { modalData, modalProperties } = getModalData(key)
  let dataInfo: Record<string, string> = {}
  for (const { customId } of modalData) {
    dataInfo = ({ ...dataInfo, [customId]: fields.getTextInputValue(customId) })
  }
  console.log(dataInfo)

  switch (key) {
    case 'CtrlPanel': {
      if (dataInfo.email === undefined) return
      const [validador, messageInfo] = validarEmail(dataInfo.email)
      if (validador) {
        core.info(`Solicitação para o E-mail: ${dataInfo.email}`)
        const { token, url } = await db.payments.get(`${guildId}.config.ctrlPanel`)

        if (token === undefined || url === undefined) {
          await interaction.reply({
            ephemeral,
            embeds: [
              new EmbedBuilder({
                title: '☹️ | Desculpe-me, mas o dono do servidor não configurou essa opção...'
              }).setColor('Red')
            ]
          })
          return
        }

        const msg = await interaction.reply({
          embeds: [
            new EmbedBuilder({
              title: 'Aguarde, estou consultando os seus dados...',
              description: '(Isso pode levar 1 minuto caso sua conta seja nova)'
            }).setColor('Yellow')
          ]
        })

        const CtrlPanelBuilder = new CtrlPanel({ url, token })
        const { status, userData } = await CtrlPanelBuilder.searchEmail({ email: dataInfo.email, guildId })

        console.log(status, userData)

        await msg.edit({
          embeds: [
            new EmbedBuilder({
              title: (status && userData !== undefined) ? `👋 Olá ${userData[0].name}` : 'Desculpe-me, mas o E-mail informado não foi encontrado...',
              description: (status && userData !== undefined) ? codeBlock(`Sabia que seu id é ${userData[0].id}?`) : undefined
            })
          ]
        })

        if (userData !== undefined) {
          await db.payments.set(`${guildId}.process.${channelId}.user`, userData[0])

          if (message !== null) {
            const PaymentBuilder = new PaymentFunction({ interaction, key })

            await db.payments.set(`${guildId}.process.${channelId}.typeRedeem`, key)
            await db.payments.set(`${guildId}.process.${channelId}.properties.${key}`, true)
            await db.payments.delete(`${guildId}.process.${channelId}.properties.Pterodactyl`)
            await db.payments.delete(`${guildId}.process.${channelId}.properties.DM`)
            await PaymentBuilder.NextOrBefore({ type: 'next', update: 'No' })

            const cartData = await db.payments.get(`${guildId}.process.${channelId}`)
            const cartBuilder = new UpdateCart({ interaction, cartData })
            await interaction.deleteReply()
            await cartBuilder.embedAndButtons({ message })
          }
        }
      } else {
        await interaction.reply({ ephemeral, content: messageInfo })
      }
      return
    }
    case 'Cupom': {
      if (dataInfo.code === undefined) return
      const codeVerify = await db.payments.get(`${guildId}.cupons.${dataInfo.code.toLowerCase()}`)

      if (codeVerify === undefined) {
        await interaction.reply({
          ephemeral,
          embeds: [
            new EmbedBuilder({
              title: '❌ | Cupom não encontrado!'
            }).setColor('Red')
          ]
        })
      } else {
        const cartData = await db.payments.get(`${guildId}.process.${channelId}`)
        if (codeVerify?.usosMax !== null && (cartData?.quantity > codeVerify?.usosMax || codeVerify[user.id]?.usos > codeVerify?.usosMax)) {
          await interaction.reply({
            ephemeral,
            embeds: [
              new EmbedBuilder({
                title: `O cupom não pode ser utilizado em mais de ${codeVerify.usosMax} produto(s)`
              }).setColor('Red')
            ]
          })
          return
        }
        await db.payments.set(`${guildId}.process.${channelId}.cupom`, {
          name: dataInfo.code.toLowerCase(),
          porcent: codeVerify.desconto
        })
        await db.payments.add(`${guildId}.cupons.${dataInfo.code.toLowerCase()}.${user.id}.usos`, 1)

        await interaction.reply({
          ephemeral,
          embeds: [
            new EmbedBuilder({
              title: `✅ | Cupom ${dataInfo.code}, foi definido!`
            }).setColor('Green')
          ]
        })

        const data = await db.payments.get(`${guildId}.process.${channelId}`)
        const msg = await channel?.messages.fetch(String(message?.id))
        const cartBuilder = new UpdateCart({ interaction, cartData: data })
        await cartBuilder.embedAndButtons({ message: msg })
      }
      return
    }

    default:
      console.log(key)
      await interaction.deferReply({ ephemeral: true })
      await db.payments.set(`${guildId}.process.${channelId}.${modalProperties.db}`, Object.entries(dataInfo)[0][1])
      await channel?.messages.fetch(String(message?.id))
        .then(async (msg) => {
          await db.payments.set(`${guildId}.process.${msg.id}.properties.${key}`, true)
          await db.payments.get(`${guildId}.process.${msg.id}`)
            .then(async (data) => {
              const cartBuilder = new UpdateCart({ interaction, cartData: data })
              await cartBuilder.embedAndButtons({ message: msg })
              /* Modo debug
              await UpdateCart.displayData({
                interaction,
                data,
                type: 'editReply'
              })
              */
              await interaction.deleteReply()
            }).catch(async (err: Error) => {
              console.log(err)
              await interaction.editReply({ content: '❌ | Ocorreu um erro!' })
            })
        })
  }
}
