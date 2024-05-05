import { type collectorButtonsForModals } from '@/interfaces'
import { ComponentType } from 'discord.js'

const modalData: Record<string, collectorButtonsForModals[]> = {
  PteroTimeout: [
    {
      label: 'Tempo para de atualização',
      placeholder: 'Ex: 15s, 5m, 1d',
      style: 1,
      maxLength: 8,
      customId: 'PteroTimeout',
      type: ComponentType.TextInput,
      db: 'pterodactyl.timeout'
    }
  ]
}

export function getModalData (key: string): collectorButtonsForModals[] {
  return modalData[key]
}
