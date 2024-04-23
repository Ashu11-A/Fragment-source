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
  },
  SendSave: {
    title: '❓| ID do channel',
    label: 'Coloque um ID',
    placeholder: 'Ex: 379089880887721995',
    style: 1,
    maxLength: 30,
    db: 'embedChannelID',
    type: ComponentType.TextInput,
    customId: 'content'
  }
}

export function getModalData (key: string): collectorButtonsForModals {
  return buttonsModals[key]
}
