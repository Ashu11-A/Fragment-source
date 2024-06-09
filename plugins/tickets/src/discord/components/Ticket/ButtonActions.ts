import { TicketBuilder } from "@/class/TicketBuilder.js";
import { Database } from "@/controller/database.js";
import { Error } from "@/discord/base/CustomResponse.js";
import { Component } from "@/discord/base/index.js";
import Ticket from "@/entity/Ticket.entry.js";
import { ActionDrawer } from "@/functions/actionDrawer.js";
import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
const ticket = new Database<Ticket>({ table: 'Ticket' })

new Component({
  customId: 'Switch',
  type: "Button",
  async run(interaction) {
    const { guild, channelId, channel, user } = interaction
    if (!interaction.inCachedGuild()) return
    interaction.deferReply({ ephemeral: true })
    if (guild === null) return await new Error({ element: 'executar essa ação pois você teve estar em uma Guilda!', interaction }).notPossible().reply()

    const ticketData = (await ticket.findOne({ where: { channelId } }))
    if (ticketData === null) return await new Error({ element: `o ticket ${channelId}`, interaction }).notFound({ type: 'Database' }).reply()

    const isClosed = !ticketData.closed
    const builder = new TicketBuilder({ interaction })

    await builder
      .setData(ticketData)
      .setClosed(!ticketData.closed)
      .addEvent({
        user: { id: user.id, name: user.displayName },
        message: `Usuário ${user.displayName}(${user.id}), fechou o ticket!`,
        date: new Date(),
      })
      .update()

    await interaction.deleteReply()
    await channel?.send({
      embeds: [
        new EmbedBuilder({
          title: isClosed ? '🔒 Ticket fechado!' : '🔓 Ticket aberto!',
          footer: { text: `Por: ${user.displayName} | Id: ${user.id}`, iconURL: user?.avatarURL() ?? undefined }
        }).setColor(isClosed ? 'Red' : 'Green')
      ]
    })
  },
})

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