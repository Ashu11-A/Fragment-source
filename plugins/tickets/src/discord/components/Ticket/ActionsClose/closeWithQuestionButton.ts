import { ResponderType } from '@constatic/base'
import { ActionDrawer, createResponder, ModalBuilder } from 'discord'
import { TextInputBuilder, TextInputStyle } from 'discord.js'

export default createResponder({
  customId: 'Close-With-Question',
  types: [ResponderType.Button],
  async run (interaction) {
    const modal = new ModalBuilder({ customId: 'Close-With-Question', title: 'Conclução do atendimento' })
    const components = ActionDrawer<TextInputBuilder>([
      new TextInputBuilder({ customId: 'observation', label: 'Observação?', required: true, maxLength: 255, style: TextInputStyle.Paragraph, placeholder: 'O player de boa-fé entregou o item...' }),
      new TextInputBuilder({ customId: 'reason', label: 'Motivo do atendimento?', required: true, maxLength: 255, style: TextInputStyle.Paragraph, placeholder: 'O player abriu ticket para informar que...' })
    ], 1)
    modal.setComponents(components)
    await interaction.showModal(modal)
  },
})
