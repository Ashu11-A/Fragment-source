import { type CustomIdHandlers } from '@/interfaces'
import { type StringSelectMenuInteraction } from 'discord.js'
import { delModalPresence } from './functions/Presence'

export async function configCollectorSelect (options: {
  interaction: StringSelectMenuInteraction
  key: string
}): Promise<void> {
  const { interaction, key } = options
  if (!interaction.inGuild()) return

  const customIdHandlers: CustomIdHandlers = {
    messagesStatusArray: async () => { await delModalPresence({ interaction }) }
  }

  const customIdHandler = customIdHandlers[key]

  if (typeof customIdHandler === 'function') {
    await customIdHandler()
  }
}
