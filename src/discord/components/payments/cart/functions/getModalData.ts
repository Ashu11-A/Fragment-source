import { ComponentType, type TextInputComponentData } from 'discord.js'

const cartModals: Record<string, TextInputComponentData[]> = {
  CtrlPanel: [
    {
      label: 'Seu E-mail',
      style: 1,
      type: ComponentType.TextInput,
      customId: 'email'
    }
  ],
  Pterodactyl: [
    {
      label: 'Seu E-mail',
      style: 1,
      type: ComponentType.TextInput,
      customId: 'email'
    }
  ],
  Cupom: [
    {
      label: 'Seu Cupom',
      style: 1,
      type: ComponentType.TextInput,
      customId: 'code'
    }
  ]
}

const cartTitle: Record<string, Record<string, string>> = {
  Pterodactyl: {
    title: '❓| Qual é o seu email cadastrado no Painel?',
    db: 'pterodactyl'
  },
  CtrlPanel: {
    title: '❓| Qual é o seu email cadastrado no Dash?',
    db: 'ctrlpanel'
  },
  Cupom: {
    title: '❓| Qual cupom deseja utilizar?',
    db: 'cupom'
  }
}

export function getModalData (key: string): { modalData: TextInputComponentData[], modalProperties: Record<string, string> } {
  return { modalData: cartModals[key], modalProperties: cartTitle[key] }
}
