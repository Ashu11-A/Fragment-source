import { db } from '@/app'
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, type ButtonInteraction, type CacheType } from 'discord.js'
import { createPayment } from '../functions/createPayment'
import { PaymentFunction } from './functions/cartCollectorFunctions'
import { getModalData } from './functions/getModalData'
import { type CustomIdHandlers } from '@/interfaces'

export async function cartCollectorButtons (options: {
  interaction: ButtonInteraction<CacheType>
  key: string
}): Promise<void> {
  const { interaction, key } = options
  if (!interaction.inGuild()) return
  const { guildId, channelId } = interaction
  const PaymentBuilder = new PaymentFunction({ interaction, key })

  const customIdHandlers: CustomIdHandlers = {
    Verify: async () => { await PaymentBuilder.verifyPayment() },

    WTF: async () => { await PaymentBuilder.WTF() },

    Add: async () => { await PaymentBuilder.AddOrRem({ type: 'Add' }) },
    Rem: async () => { await PaymentBuilder.AddOrRem({ type: 'Rem' }) },
    Remove: async () => { await PaymentBuilder.RemoveItem() },

    Next: async () => { await PaymentBuilder.NextOrBefore({ type: 'next' }) },
    Before: async () => { await PaymentBuilder.NextOrBefore({ type: 'before' }) },
    Cancelar: async () => { await PaymentBuilder.Cancelar() },

    Pix: async () => { await createPayment({ interaction, method: 'pix' }) },
    CardDebito: async () => { await createPayment({ interaction, method: 'debit_card' }) },
    CardCredito: async () => { await createPayment({ interaction, method: 'credit_card' }) },

    DM: async () => { await PaymentBuilder.DM() },
    Registro: async () => { await PaymentBuilder.Registro() },
    Login: async () => { await PaymentBuilder.Login() }
  }

  const customIdHandler = customIdHandlers[key]

  if (typeof customIdHandler === 'function') {
    await interaction.deferReply({ ephemeral })
    await customIdHandler()
  } else {
    const { modalData, modalProperties } = getModalData(key)

    const modal = new ModalBuilder({ customId: interaction.customId, title: modalProperties.title })
    const contentData = new Array<ActionRowBuilder<TextInputBuilder>>()

    for (const [position, value] of modalData.entries()) {
      const { label, style, type, placeholder, maxLength, customId } = value
      const textValue = await db.payments.get(`${guildId}.process.${channelId}.${modalProperties.db}.${customId}`)
      if (!(contentData[position] instanceof ActionRowBuilder)) {
        contentData[position] = new ActionRowBuilder<TextInputBuilder>()
      }
      contentData[position].addComponents(
        new TextInputBuilder({
          customId,
          label,
          placeholder,
          value: textValue ?? undefined,
          style,
          required: true,
          maxLength,
          type
        })
      )
    }

    modal.setComponents(contentData)
    await interaction.showModal(modal)
  }
}
