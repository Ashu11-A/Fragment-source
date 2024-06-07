import { TicketBuilder } from "@/class/TicketBuilder";
import { Database } from "@/controller/database";
import { Component } from "@/discord/base";
import { Error } from "@/discord/base/CustomResponse";
import Template from "@/entity/Template.entry";

const template = new Database<Template>({ table: 'Template' })

new Component({
  customId: 'Open',
  type: 'Button',
  cache: 'cached',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ ephemeral: true })

    const { user, message } = interaction
    const templateData = await template.findOne({ where: { messageId: message.id } })
    if (templateData === null) return await new Error({ element: 'esse template', interaction }).notFound({ type: "Database" }).reply()

    const ticket = new TicketBuilder({ interaction: interaction })
    await ticket.setOwner(user.id).setTemplateId(templateData.id).render().create()
  }
})