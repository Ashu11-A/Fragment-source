import { Component } from "../base"

new Component({
  customId: 'test',
  cache: 'cached',
  type: 'Button',
  async run (interaction) {
    await interaction.reply({
      content: 'Test'
    })
  }
})
