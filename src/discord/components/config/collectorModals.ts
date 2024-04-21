import { type CustomIdHandlers } from '@/interfaces'
import { type ModalSubmitInteraction, type CacheType } from 'discord.js'
import { mcConfig } from './functions/mercadoPago'
import { setPresence } from './functions/Presence'

export async function configCollectorModals (options: {
  interaction: ModalSubmitInteraction<CacheType>
  key: string
}): Promise<void> {
  const { interaction, key } = options
  if (!interaction.inGuild()) return

  const customIdHandlers: CustomIdHandlers = {
    mcConfig: async () => { await mcConfig({ interaction }) },
    addPresence: async () => { await setPresence({ interaction }) }
  }

  const customIdHandler = customIdHandlers[key]

  if (typeof customIdHandler === 'function') {
    await customIdHandler()
  }
}
