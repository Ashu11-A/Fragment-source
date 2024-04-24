import { db } from '@/app'
import { type CustomIdHandlers } from '@/interfaces'
import { type TicketCategories } from '@/interfaces/Ticket'
import { codeBlock, EmbedBuilder, type CacheType, type StringSelectMenuInteraction } from 'discord.js'
import { TicketButtons } from './buttonsFunctions'
import { TicketPanel } from './panelTicket'
import { Ticket } from './ticket'
import { ticketButtonsConfig } from './ticketUpdateConfig'
import { Discord } from '@/functions'

interface TicketType {
  interaction: StringSelectMenuInteraction<CacheType>
}
export class TicketSelects implements TicketType {
  interaction
  constructor ({ interaction }: TicketType) {
    this.interaction = interaction
  }

  /**
   * Abre os tickets por meio do menu Select
   */
  public async Product (): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isStringSelectMenu()) return

    const { values, guildId, channelId, message } = interaction
    const posição = values[0]
    const { select: infos } = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message.id}`)
    const Constructor = new Ticket({ interaction: this.interaction })

    if (posição === 'config') {
      if (!await Discord.Permission(interaction, 'Administrator')) await ticketButtonsConfig({ interaction })
      return
    }

    if (Number(posição) >= 0 && Number(posição) < infos.length) {
      const { title, description, emoji } = infos[Number(posição)]
      await Constructor.create({ title, description, categoryEmoji: emoji, categoryName: title })
    } else {
      console.log('Posição inválida no banco de dados.')
      await this.interaction.editReply({ content: '❌ | As informações do Banco de dados estão desatualizadas' })
    }
  }

  /**
   * Debug
   */
  public async Debug (): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isStringSelectMenu()) return

    const { guildId, channelId, message } = interaction
    const { select: values } = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message?.id}`)

    if (Array.isArray(values)) {
      const deleteValues = interaction.values.map(Number)
      const updatedValues = values.filter((_: string, index: number) => !deleteValues.includes(index))

      await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message?.id}.select`, updatedValues)
      await this.interaction.editReply({
        content: '✅ Valores removidos com sucesso!'
      })
      await ticketButtonsConfig({ interaction: this.interaction })
    } else {
      console.error('Values is not an array. Handle this case appropriately.')
    }
  }

  /**
   * name
   */
  async CollectorSelect (): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isStringSelectMenu()) return

    const { values } = interaction
    const PanelConstructor = new TicketPanel({ interaction })
    const Constructor = new Ticket({ interaction })

    const customIdHandlers: CustomIdHandlers = {
      CreateCall: async () => { await PanelConstructor.CreateCall() },
      AddUser: async () => { await PanelConstructor.AddUser() },
      RemoveUser: async () => { await PanelConstructor.RemoveUser() },
      Transcript: async () => {},
      delTicket: async () => { await Constructor.delete({ type: 'delTicket' }) }
    }

    const customIdHandler = customIdHandlers[values[0]]

    if (typeof customIdHandler === 'function') {
      if (values[0] !== 'AddUser') await this.interaction.deferReply({ ephemeral })
      await customIdHandler()
      return
    }

    await this.interaction.reply({
      ephemeral,
      embeds: [new EmbedBuilder({
        title: '❌ | Função inexistente.'
      }).setColor('Red')]
    })
  }

  async RemoveUser (): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isStringSelectMenu()) return
    const { values, channelId } = interaction
    const Constructor = new Ticket({ interaction })

    for (const value of values) {
      await Constructor.Permissions({ userId: value, channelId, remove: true })
    }
  }

  async RemCategory ({ titles = [] }: { titles?: string[] }): Promise<void> {
    const interaction = this.interaction
    const { guildId } = interaction
    if (interaction.isStringSelectMenu()) titles = interaction.values

    let categories = await db.tickets.get(`${guildId}.system.categories`) as TicketCategories[] ?? []

    for (const title of titles) {
      categories = categories.filter((category) => category.title.toLowerCase() !== title.toLowerCase())
    }

    await db.tickets.set(`${guildId}.system.categories`, categories)
    await interaction.editReply({
      embeds: [new EmbedBuilder({
        title: '✅ | Categorias deletadas com sucesso!',
        description: `Categorias: ${codeBlock(titles.join(', '))}`
      }).setColor('Green')]
    })
  }

  async SelectType (): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isStringSelectMenu()) return

    const { values, guildId, user } = interaction
    const split = values[0].split('-')
    const Constructor = new Ticket({ interaction: this.interaction })
    const ButtonConstructor = new TicketButtons({ interaction: this.interaction })

    switch (split[2]) {
      case 'button': {
        await interaction.deferReply({ ephemeral })
        await Constructor.create({ title: 'Não foi possível descobrir.', categoryEmoji: split[0], categoryName: split[1] })
        await db.tickets.set(`${guildId}.users.${user.id}.preferences.category`, split[1])
        break
      }
      case 'modal': {
        await ButtonConstructor.OpenModal()
        await db.tickets.set(`${guildId}.users.${user.id}.preferences.category`, split[1])
        break
      }
    }
  }
}
