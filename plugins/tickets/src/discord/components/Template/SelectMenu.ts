import { TemplateBuilder } from "@/class/TemplateBuilder.js";
import { TicketBuilder } from "@/class/TicketBuilder.js";
import { Component } from "@/discord/base/Components.js";
import { Error } from "@/discord/base/CustomResponse.js";
import { templateDB } from "@/functions/database.js";
import { PermissionsBitField } from "discord.js";

new Component({
  customId: 'SelectMenu',
  type: 'StringSelect',
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    await interaction.deferReply({ ephemeral: true })
    const { values, message, user } = interaction
    const select = values[0]
    
    if (select === 'config') {
      if (!(interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator ?? false))){
        throw await new Error({ element: 'você', interaction }).forbidden().reply()
      }
      await new TemplateBuilder({ interaction }).setMode('debug').edit({ messageId: message.id })
      await interaction.deleteReply()
      return
    }

    const templateData = await templateDB.findOne({ where: { messageId: message.id } })
    if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: "Database" }).reply()

    const typeTicket = templateData?.selects[Number(select)]
    if (typeTicket === undefined) throw await new Error({ element: 'select', interaction }).notFound({ type: "Database" }).reply()

    await new TicketBuilder({ interaction })
      .setOwner(user.id)
      .setTitle(typeTicket.title)
      .setDescription(typeTicket.description)
      .setCategory({ emoji: typeTicket.emoji, title: typeTicket.title })
      .create()
  },
})