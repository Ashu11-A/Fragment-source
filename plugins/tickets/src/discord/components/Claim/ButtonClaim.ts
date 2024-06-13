import { TicketBuilder } from "@/class/TicketBuilder.js";
import { Discord } from "@/discord/base/Client.js";
import { Component } from "@/discord/base/Components.js";
import { Error } from "@/discord/base/CustomResponse.js";
import { claimDB } from "@/functions/database.js";
import { EmbedBuilder } from "discord.js";


new Component({
  customId: 'Claim',
  type: "Button",
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ ephemeral: true })

    const { message, user, guildId, guild } = interaction
    const claimData = await claimDB.findOne({ where: { messageId: message.id }, relations: { ticket: true } })
    if (claimData === undefined || claimData?.ticket === undefined) return await new Error({ element: 'Claim', interaction }).notFound({ type: 'Database' }).reply()
    const userTicket = await guild.client.users.fetch(claimData.ticket.ownerId).catch(() => undefined)

    if (userTicket === undefined) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '⚠️ | Usuário não se encontra mais no servidor, você pode apenas apagar o ticket!'
        }).setColor('Red')]
      })
      return
    }

    const goTicket = Discord.buttonRedirect({
      guildId,
      channelId: claimData.ticket.channelId,
      emoji: { name: '🎫' },
      label: 'Ir ao Ticket'
    })
    

    if (claimData.ticket.team.find((userTeam) => userTeam.id === user.id) !== undefined ?? false) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ | Você já está atendendo este ticket!'
        }).setColor('Red')],
        components: [goTicket]
      })
      return
    }

    (await (new TicketBuilder({ interaction }).setData(claimData.ticket)
      .addTeam({ displayName: user.displayName, id: user.id, name: user.username })
      .addEvent({ date: new Date(), message: `Usuário ${user.displayName}, reivindicou o ticket!`, user: { id: user.id, name: user.username } })
      .update())
    )?.send([
      new EmbedBuilder({ title: `Usuário ${user.displayName}, reivindicou o ticket!` }).setColor('Green')
    ]).then(async () => {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: `Olá ${user.username}`,
            description: '✅ | Você foi adicionado ao ticket!'
          }).setColor('Green')
        ],
        components: [goTicket]
      })
    })
  },
})