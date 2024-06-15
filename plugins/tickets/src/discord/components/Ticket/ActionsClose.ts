import { TicketBuilder } from "@/class/TicketBuilder.js";
import { ModalBuilder } from "@/discord/base/CustomIntetaction.js";
import { Component } from "@/discord/base/index.js";
import { ActionDrawer } from "@/functions/actionDrawer.js";
import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

new Component({
  customId: 'Close',
  type: "Button",
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    const { user, channelId } = interaction
    await interaction.deferReply({ ephemeral: true })

    const messagePrimary = await interaction.editReply({
      embeds: [new EmbedBuilder({
        description: 'Tem certeza que deseja fechar o Ticket?'
      }).setColor('Orange')],
      components: ActionDrawer<ButtonBuilder>([
        new ButtonBuilder({ customId: 'embed-confirm-button', label: 'Confirmar', style: ButtonStyle.Success }),
        new ButtonBuilder({ customId: 'embed-cancel-button', label: 'Cancelar', style: ButtonStyle.Danger })
      ])
    })
    const collector = messagePrimary.createMessageComponentCollector({ componentType: ComponentType.Button })
    
    collector.on('collect', async (subInteraction) => {
      collector.stop()
      const clearData = { components: [], embeds: [] }

      if (subInteraction.customId === 'embed-cancel-button') {
        await subInteraction.update({
          ...clearData,
          embeds: [
            new EmbedBuilder({
              title: 'Você cancelou a ação'
            }).setColor('Green')
          ]
        })
      } else if (subInteraction.customId === 'embed-confirm-button') {
        const now = new Date()
        const futureTime = new Date(now.getTime() + 5000)
        const futureTimeString = `<t:${Math.floor(futureTime.getTime() / 1000)}:R>`
        const ticketBuilder = new TicketBuilder({ interaction })

        await subInteraction.update({
          ...clearData,
          embeds: [new EmbedBuilder({
            title: `👋 | Olá ${user.username}`,
            description: `❗️ | Esse ticket será excluído em ${futureTimeString} segundos.`
          }).setColor('Red')]
        })
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 5000))
      
        await (await ticketBuilder.setTicket(channelId).loader()).delete()
      }
    })
  },
})

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
    const { channelId, fields } = interaction
    if (!interaction.inCachedGuild() || channelId === null) return
    const observation = fields.getTextInputValue('observation')
    const reason = fields.getTextInputValue('reason')
    const builder = new TicketBuilder({ interaction })

    await interaction.deferReply({ ephemeral: true })
    await (await builder.setTicket(channelId).loader()).delete({ observation, reason })
  }
})