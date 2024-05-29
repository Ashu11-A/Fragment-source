import { TicketBuilder } from "@/class/TicketBuilder";
import { Component } from "@/discord/base";

new Component({
  customId: 'Open',
  type: 'Button',
  async run(interaction) {
    const ticket = new TicketBuilder({ interaction })
    const result = await ticket.setOwner(interaction.user.id).render().create()
    if (result === null || result === undefined) return
    
    await ticket.delete({ id: result.id })
  },
})