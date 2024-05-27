import { Template } from "@/class/Template";
import { TemplateBuilder } from "@/class/TemplateBuilder";
import { Component } from "@/discord/base";

new Component({
  customId: 'Save',
  type: "Button",
  async run(interaction) {
    await interaction.deferReply({ ephemeral: true })
    await new TemplateBuilder({ interaction })
      .setMode('production')
      .edit({ messageId: interaction.message.id })

    if (!interaction.replied) await interaction.deleteReply()
  },
})

new Component({
  customId: 'Config',
  type: "Button",
  async run(interaction) {
    await new TemplateBuilder({ interaction })
      .setMode('debug')
      .edit({ messageId: interaction.message.id })

    if (!interaction.replied) await interaction.deleteReply()
  },
})