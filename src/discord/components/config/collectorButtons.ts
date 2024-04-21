import { type CustomIdHandlers } from '@/interfaces'
import { type ButtonInteraction, type CacheType } from 'discord.js'
import { delPresence, modalPresence } from './functions/Presence'

export async function configCollectorButtons (options: {
  interaction: ButtonInteraction<CacheType>
  key: string
}): Promise<void> {
  const { interaction, key } = options
  if (!interaction.inGuild()) return

  const customIdHandlers: CustomIdHandlers = {
    AddPresence: async () => { await modalPresence({ interaction }) },
    RemPresence: async () => { await delPresence({ interaction }) }
  }

  const customIdHandler = customIdHandlers[key]

  if (typeof customIdHandler === 'function') {
    await customIdHandler()
  }
}
