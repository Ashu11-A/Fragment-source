import { db } from '@/app'
import { TicketButtons } from '@/discord/components/tickets'
import { type CustomIdHandlers } from '@/interfaces'
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, type ButtonInteraction, type CacheType } from 'discord.js'
import { getModalData } from './functions/getModalData'
import { TicketPanel } from './functions/panelTicket'
import { Ticket } from './functions/ticket'
import { TicketClaim } from './functions/claim'

const listItens = {
  SetName: {
    label: '❓| Qual será o Título?',
    placeholder: 'Ex: Parceria',
    style: 1,
    valuee: undefined,
    maxLength: 256,
    type: 'title'
  },
  SetDesc: {
    label: '❓| Qual será a Descrição?',
    placeholder: 'Ex: Quero me tornar um parceiro.',
    style: 1,
    valuee: undefined,
    maxLength: 256,
    type: 'description'
  },
  SetEmoji: {
    label: '❓| Qual será o Emoji? (somente um)',
    placeholder: 'Ex: 🎟️🎫💰🎲💵🗂️.',
    valuee: '💰',
    style: 1,
    maxLength: 10,
    type: 'emoji'
  }
}

const listForAddCategory = {
  SetName: {
    label: '❓| Qual será o Nome?',
    placeholder: 'Ex: Parceria',
    style: 1,
    valuee: undefined,
    maxLength: 25,
    type: 'title'
  },
  SetEmoji: {
    label: '❓| Qual será o Emoji? (somente um)',
    placeholder: 'Ex: 🎟️🎫💰🎲💵🗂️.',
    valuee: '🎟️',
    style: 1,
    maxLength: 10,
    type: 'emoji'
  }
}

export async function ticketCollectorButtons (options: {
  interaction: ButtonInteraction<CacheType>
  key: string
}): Promise<void> {
  const { interaction, key } = options
  const { guildId, message, channelId, customId } = interaction
  const Constructor = new Ticket({ interaction })
  const ButtonConstructor = new TicketButtons({ interaction })
  const PanelConstructor = new TicketPanel({ interaction })
  const ClaimConstructor = new TicketClaim({ interaction })

  const customIdHandlers: CustomIdHandlers = {
    SelectType: async () => { await ButtonConstructor.SelectType() },

    delTicket: async () => { await Constructor.delete({ type: 'delTicket' }) },
    EmbedDelete: async () => { await Constructor.delete({ type: 'EmbedDelete' }) },

    SetSelect: async () => { await ButtonConstructor.setSystem({ type: 'select' }) },
    SetButton: async () => { await ButtonConstructor.setSystem({ type: 'button' }) },
    SetModal: async () => { await ButtonConstructor.setSystem({ type: 'modal' }) },

    SendSave: async () => { await ButtonConstructor.sendSave(key) },
    AddSelect: async () => {
      const modal = new ModalBuilder({ customId, title: 'Adicionar Opções no Select Menu' })
      Object.entries(listItens).map(([, value]) => {
        const { label, placeholder, style, type, maxLength, valuee } = value
        const content = new ActionRowBuilder<TextInputBuilder>({
          components: [
            new TextInputBuilder({
              custom_id: type,
              label,
              placeholder,
              style,
              value: valuee,
              required: true,
              maxLength
            })
          ]
        })
        return modal.addComponents(content)
      })
      await interaction.showModal(modal)
    },

    Panel: async () => { await PanelConstructor.CreatePanel() },

    EmbedCategory: async () => { await Constructor.PanelCategory() },
    AddCategory: async () => {
      const modal = new ModalBuilder({ customId, title: 'Adicionar Opções no Category Menu' })
      Object.entries(listForAddCategory).map(([, value]) => {
        const { label, placeholder, style, type, maxLength, valuee } = value
        const content = new ActionRowBuilder<TextInputBuilder>({
          components: [
            new TextInputBuilder({
              custom_id: type,
              label,
              placeholder,
              style,
              value: valuee,
              required: true,
              maxLength
            })
          ]
        })
        return modal.addComponents(content)
      })
      await interaction.showModal(modal)
    },
    RemCategory: async () => { await ButtonConstructor.RemCategory() },

    /* Sistema de Claim */
    Claim: async () => { await ClaimConstructor.Claim({ key }) },
    SaveLogs: async () => { await ClaimConstructor.SaveLogs() },
    Delete: async () => { await ClaimConstructor.Delete({ key }) }
  }

  const customIdHandler = customIdHandlers[key.split('-')[0]]

  if (typeof customIdHandler === 'function') {
    if (key !== 'AddSelect' && key !== 'SendSave' && key !== 'OpenModal' && key !== 'AddCategory') await interaction.deferReply({ ephemeral })
    await customIdHandler()
  } else {
    const { title, label, placeholder, style, type, maxLength, db: dataDB } = getModalData(key)
    const textValue = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message.id}.${dataDB}`)
    const modal = new ModalBuilder({ customId, title })
    const content = new ActionRowBuilder<TextInputBuilder>({
      components: [
        new TextInputBuilder({
          custom_id: 'content',
          label,
          placeholder,
          value: textValue ?? null,
          style,
          required: true,
          maxLength,
          type
        })
      ]
    })
    modal.setComponents(content)
    await interaction.showModal(modal)
  }
}
