// Isso irá pegar todos os eventos que um botão é precionado e irá destrinjar ele para os seus reais ações
import { core } from '@/app'
import { CustomButtonBuilder, Discord } from '@/functions'
import { getInternalSettings, getSettings } from '@/functions/getSettings'
import { EmbedBuilder } from 'discord.js'
import { Event } from '../base'
import { ButtonController } from './controller'

new Event({
  name: 'interactionCreate',
  async run (interaction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return
    const start = Date.now() // Mostrar delay
    const { customId, user: { username }, guild } = interaction
    const typeAction = interaction.isButton() ? 'Buttom' : interaction.isModalSubmit() ? 'Modal' : 'Select'
    const [id, permission, type, action, userId] = CustomButtonBuilder.getInfos(customId)
    const { Auth } = getSettings()
    const internalDB = getInternalSettings()

    if (Auth === undefined) {
      await interaction.reply({
        ephemeral,
        embeds: [
          new EmbedBuilder({
            title: '⚠️ Token invalido ou inexistente.',
            description: 'Caso queira usar esse bot, mande uma DM para `ashu11a`.'
          }).setColor('Red')
        ]
      })
      return
    }

    if (internalDB?.expired === undefined || internalDB.expired) {
      await interaction.reply({
        ephemeral,
        embeds: [new EmbedBuilder({ title: '⚠️ Bot sem licença!' }).setColor('Red')]
      })
      return
    }

    if (internalDB?.enabled === undefined || !internalDB.enabled) {
      await interaction.reply({
        ephemeral,
        embeds: [new EmbedBuilder({ title: '⚠️ Bot desabilitado!' })]
      })
      return
    }

    if (id === undefined || action === undefined) { console.log('Nenhuma ação foi expecificada no botão'); return }

    // <-- Verifica a permição -->
    if (permission !== 'User') if (await Discord.Permission(interaction, 'Administrator', 'noPermission')) return
    core.info(`${username} | Id: ${id} | Permission: ${permission} | Type: ${type} | typeAction: ${typeAction} | Action: ${action} | userID: ${userId}`)
    const Controller = new ButtonController({ interaction, key: action })

    switch (type) {
      case 'Product': {
        await Controller.product()
        break
      }
      case 'SUEE': {
        await Controller.SUEE()
        break
      }
      case 'Cart': {
        await Controller.cart()
        break
      }
      case 'System': {
        await Controller.system()
        break
      }
      case 'Ticket': {
        await Controller.ticket()
        break
      }
      case 'Event': {
        await Controller.event()
        break
      }
      case 'Config': {
        await Controller.config()
        break
      }
      case 'Account': {
        await Controller.account()
        break
      }
    }
    const end = Date.now()
    const timeSpent = (end - start) / 1000 + 's'
    core.info(`${type} | ${action} | ${timeSpent}`)
  }
})
