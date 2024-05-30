import { TicketBuilder } from "@/class/TicketBuilder";
import { Component } from "@/discord/base";
import { ButtonInteraction } from "discord.js";

new Component({
  customId: 'Open',
  type: 'Button',
  cache: 'cached',
  async run(interaction) {
    const ticket = new TicketBuilder({ interaction: interaction as ButtonInteraction<'cached'> })
    const result = await ticket.setOwner(interaction.user.id).render().create()
    if (result === null || result === undefined) return
    
    // await ticket.delete({ id: result.id })
  },
})