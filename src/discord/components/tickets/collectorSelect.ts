import { type CustomIdHandlers } from '@/interfaces'
import { type CacheType, type StringSelectMenuInteraction } from 'discord.js'
import { TicketSelects } from './functions/selectsFunction'
import { PanelTicket } from './functions/panelTicket'

export async function ticketCollectorSelect (options: {
  interaction: StringSelectMenuInteraction<CacheType>
  key: string
}): Promise<void> {
  const { interaction, key } = options
  const TicketSelectConstructor = new TicketSelects({ interaction })
  const PanelConstructor = new PanelTicket({ interaction })

  const customIdHandlers: CustomIdHandlers = {
    RowSelect: async () => { await TicketSelectConstructor.Debug() },
    RowSelectProduction: async () => { await TicketSelectConstructor.Product() },
    PanelSelect: async () => { await PanelConstructor.CollectorSelect() }
  }

  const customIdHandler = customIdHandlers[key]

  if (typeof customIdHandler === 'function') {
    if (key !== 'PanelSelect') await interaction.deferReply({ ephemeral })
    await customIdHandler()
  }
}
