import { TicketBuilder } from "@/class/TicketBuilder.js";
import { TicketPanel } from "@/class/TicketPanel.js";
import { Component } from "@/discord/base/index.js";
import { ActionDrawer } from "@/functions/actionDrawer.js";
import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";

new Component({
  customId: 'PanelSelect',
  type: "StringSelect",
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ ephemeral: true })
    const { values, user, channelId } = interaction
    const builder = new TicketPanel({ interaction })
    
    switch (values[0]) {
    case 'CreateCall': { await builder.CreateCall(); break }
    case 'AddUser': { await builder.AddUser(); break }
    case 'RemoveUser': { await builder.RemoveUser(); break }
    case 'Transcript': { }
    case 'Delete': {
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
    }
    }
  }
})