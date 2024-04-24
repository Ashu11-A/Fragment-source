import { type collectorButtonsForModals } from '@/interfaces'
import { ComponentType } from 'discord.js'

const buttonsModals: Record<string, collectorButtonsForModals> = {
  AddSelect: {
    db: 'select',
    title: '',
    type: ComponentType.TextInput,
    customId: 'content',
    style: 1,
    label: ''
  }
}

export function getModalData (key: string): collectorButtonsForModals {
  return buttonsModals[key]
}
