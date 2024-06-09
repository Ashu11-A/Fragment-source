import { TicketBuilder } from "@/class/TicketBuilder.js";
import { Component } from "@/discord/base/index.js";

new Component({
  customId: 'Open',
  type: 'Button',
  cache: 'cached',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ ephemeral: true })

    const { user } = interaction
    const ticket = new TicketBuilder({ interaction })
  
    await ticket.setOwner(user.id).render().create()
  }
})