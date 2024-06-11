import { Component } from "../base/index.js"

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
