import { TicketModals } from '@/discord/components/tickets'
import { type CustomIdHandlers } from '@/interfaces'
import { type CacheType, type ModalSubmitInteraction } from 'discord.js'
import { TicketPanel } from './functions/panelTicket'

export async function ticketCollectorModal (options: {
  interaction: ModalSubmitInteraction<CacheType>
  key: string
}): Promise<void> {
  const { interaction, key } = options
  const ticketConstructor = new TicketModals({ interaction })
  const panelTicket = new TicketPanel({ interaction })

  const customIdHandlers: CustomIdHandlers = {
    AddSelect: async () => { await ticketConstructor.AddSelect(key) },
    SendSave: async () => { await ticketConstructor.sendSave(key) },
    SetRole: async () => { await ticketConstructor.setConfig(key) },

    AddUserModal: async () => { await panelTicket.EditChannelCollector({}) },
    OpenModalCollector: async () => { await ticketConstructor.OpenModalCollector() }
  }

  const customIdHandler = customIdHandlers[key]

  if (typeof customIdHandler === 'function') {
    if (key !== 'SendSave') await interaction.deferReply({ ephemeral: true })
    await customIdHandler()
  }
}
