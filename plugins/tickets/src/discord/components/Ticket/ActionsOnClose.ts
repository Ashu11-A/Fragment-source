import { TicketBuilder } from "@/class/TicketBuilder.js";
import { ModalBuilder } from "@/discord/base/CustomIntetaction.js";
import { Component } from "@/discord/base/index.js";
import { ActionDrawer } from "@/functions/actionDrawer.js";
import { TextInputBuilder, TextInputStyle } from "discord.js";

new Component({
  customId: 'Close-With-Question',
  type: "Button",
  async run(interaction) {
    const modal = new ModalBuilder({ customId: 'Close-With-Question', title: 'Conclução do atendimento' })

    const components = ActionDrawer<TextInputBuilder>([
      new TextInputBuilder({
        customId: 'observation',
        label: 'Observação?',
        required: true,
        maxLength: 255,
        style: TextInputStyle.Paragraph,
        placeholder: 'O player de boa-fé entregou o item...'
      }),
      new TextInputBuilder({
        customId: 'reason',
        label: 'Motivo do atendimento?',
        required: true,
        maxLength: 255,
        style: TextInputStyle.Paragraph,
        placeholder: 'O player abriu ticket para informar que...'
      })
    ], 1)
    modal.setComponents(components)
    await interaction.showModal(modal)
  },
})

new Component({
  customId: 'Close-With-Question',
  type: "Modal",
  async run(interaction) {
    const { channelId } = interaction
    if (!interaction.inCachedGuild() || channelId === null) return
    // const observation = fields.getTextInputValue('observation')
    // const reason = fields.getTextInputValue('reason')
    const builder = new TicketBuilder({ interaction })

    await interaction.deferReply({ ephemeral: true })
    await (await builder.setTicket(channelId).loader()).delete()
  }
})

// new Component({
//   customId: 'Panel',
//   type: "Button",
//   async run(interaction) {
          
//   },
// })