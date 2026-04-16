import { ResponderType } from '@constatic/base'
import { createResponder, ModalBuilder } from 'discord'
import { ActionRowBuilder, TextInputBuilder } from 'discord.js'
import { elementsSelect } from '@/lib/addSelectShared.js'

export default createResponder({
  customId: 'AddSelect',
  types: [ResponderType.Button],
  async run (interaction) {
    const modal = new ModalBuilder({ title: 'Adicionar opções do SelectMenu', customId: 'AddSelect' })
    for (const element of elementsSelect) {
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder(element)))
    }
    await interaction.showModal(modal)
  },
})
