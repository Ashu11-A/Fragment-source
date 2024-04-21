import { type CustomIdHandlers } from '@/interfaces'
import { type CacheType, type StringSelectMenuInteraction } from 'discord.js'
import { TicketSelects } from './functions/selectsFunction'

export async function ticketCollectorSelect (options: {
  interaction: StringSelectMenuInteraction<CacheType>
  key: string
}): Promise<void> {
  const { interaction, key } = options
  const SelectConstructor = new TicketSelects({ interaction })

  const customIdHandlers: CustomIdHandlers = {
    RowSelect: async () => { await SelectConstructor.Debug() },
    RowSelectProduction: async () => { await SelectConstructor.Product() },
    PanelSelect: async () => { await SelectConstructor.CollectorSelect() }
  }

  const customIdHandler = customIdHandlers[key]

  if (typeof customIdHandler === 'function') {
    if (key !== 'PanelSelect') await interaction.deferReply({ ephemeral })
    await customIdHandler()
  }
}
