import { TicketBuilder } from "@/class/TicketBuilder.js";
import { Component } from "@/discord/base/Components.js";
import { userSelect } from "./SelectOpen.js";

new Component({
  customId: 'ModalOpen',
  type: "Modal",
  async run(interaction) {
    if (!interaction.inCachedGuild()) return
    const { fields, user } = interaction
    const title = fields.fields.find((field) => field.customId === 'title')?.value as string | undefined
    const description = fields.fields.find((field) => field.customId === 'description')?.value as string

    const cache = userSelect.get(user.id)

    const builder = new TicketBuilder({ interaction })
    if (title !== undefined) builder.setTitle(title)
    if (cache !== undefined) { builder.setCategory(cache.category); builder.setTemplateId(cache.templateId) }
    builder.setOwner(user.id)
    builder.setDescription(description)
    await builder.create()
  },
})