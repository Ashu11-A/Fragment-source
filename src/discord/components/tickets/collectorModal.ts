import { TicketModals } from '@/discord/components/tickets'
import { type CustomIdHandlers } from '@/interfaces'
import { type CacheType, type ModalSubmitInteraction } from 'discord.js'
import { TicketPanel } from './functions/panelTicket'

export async function ticketCollectorModal (options: {
  interaction: ModalSubmitInteraction<CacheType>
  key: string
}): Promise<void> {
  const { interaction, key } = options
  const ConstructorModal = new TicketModals({ interaction })
  const panelTicket = new TicketPanel({ interaction })

  const customIdHandlers: CustomIdHandlers = {
    AddSelect: async () => { await ConstructorModal.AddSelect(key) },
    SetRole: async () => { await ConstructorModal.setConfig(key) },

    AddUserModal: async () => { await panelTicket.EditChannelCollector() },
    OpenModalCollector: async () => { await ConstructorModal.OpenModalCollector() },

    AddCategory: async () => { await ConstructorModal.AddCategory({}) },

    QuestionCollector: async () => { await ConstructorModal.Question() }
  }

  const customIdHandler = customIdHandlers[key]

  if (typeof customIdHandler === 'function') {
    await interaction.deferReply({ ephemeral: true })
    await customIdHandler()
  }
}
