import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js'
import { Event } from '../base'

new Event({
  name: 'messageCreate',
  run (message) {
    if (message.author.id === message.client.user.id) return
    const buttons = [
      new ButtonBuilder({
        customId: 'test',
        style: ButtonStyle.Primary,
        type: ComponentType.Button,
        label: 'Teste'
      })
    ]
    message.reply({
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents().addComponents(...buttons)]
    })
  }
})