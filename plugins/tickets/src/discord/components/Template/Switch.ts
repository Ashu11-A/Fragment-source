import { Ticket } from "@/class/Ticket";
import { Component } from "@/discord/base";

new Component({
  customId: 'Save',
  type: "Button",
  async run(interaction) {
    await interaction.deferReply({ ephemeral: true })
    const components = await (new Ticket({ interaction })).genProductionButtons({ messageId: interaction.message.id })

    await interaction.message.edit({ components })
    await interaction.deleteReply()
  },
})

new Component({
  customId: 'Config',
  type: "Button",
  async run(interaction) {
    await interaction.deferReply({ ephemeral: true })
    const [buttons, select] = await (new Ticket({ interaction })).genEditButtons({ messageId: interaction.message.id })

    await interaction.message.edit({ components: [...buttons, ...select] })
    await interaction.deleteReply()
  },
})