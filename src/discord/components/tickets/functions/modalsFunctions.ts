import { db } from '@/app'
import { type TicketUser, type TicketCategories } from '@/interfaces/Ticket'
import { EmbedBuilder, type EmbedData, type CacheType, type ChatInputCommandInteraction, type ModalSubmitInteraction, type TextChannel } from 'discord.js'
import { getModalData } from './getModalData'
import { Ticket } from './ticket'
import { buttonsUsers, ticketButtonsConfig } from './ticketUpdateConfig'

interface TicketType {
  interaction: ModalSubmitInteraction<CacheType> | ChatInputCommandInteraction<CacheType>
}
export class TicketModals implements TicketType {
  interaction
  constructor ({ interaction }: TicketType) {
    this.interaction = interaction
  }

  public async sendSave (key: string): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isModalSubmit()) return

    const { guild, guildId, channelId, message, fields } = interaction
    const { db: dataDB } = getModalData(key)
    const messageModal = fields.getTextInputValue('content')
    const data = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message?.id}`)
    const channel = guild?.channels.cache.find((channel) => channel.id === messageModal) as TextChannel

    await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message?.id}.${dataDB}`, messageModal)

    const updateEmbed = new EmbedBuilder(data.embed as EmbedData)
    if (data.embed !== undefined && typeof data.embed.color === 'string') {
      if (data.embed.color.startsWith('#') === true) {
        updateEmbed.setColor(parseInt(data.embed.color.slice(1), 16))
      }
    }

    const msg = await channel.send({ embeds: [updateEmbed] })
    await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message?.id}.embedMessageID`, msg.id)
    await buttonsUsers({
      interaction,
      originID: message.id,
      messageSend: msg
    })
  }

  public async AddSelect (key: string): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isModalSubmit()) return

    const { guildId, channelId, message, channel, fields } = interaction
    const fieldNames = ['title', 'description', 'emoji']
    const { select: existingData } = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message?.id}`)
    const data = existingData !== undefined ? existingData : []

    let title = ''
    let description = ''
    let emoji = ''

    for (const fieldName of fieldNames) {
      const message = fields.getTextInputValue(fieldName)

      if (fieldName === 'title') {
        title = message
      } else if (fieldName === 'description') {
        description = message
      } else if (fieldName === 'emoji') {
        emoji = message
      }
    }

    data.push({ title, description, emoji })

    await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message?.id}.select`, data)
    await channel?.messages.fetch(String(message?.id))
      .then(async (msg) => {
        const { embed } = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message?.id}`)
        if (typeof embed?.color === 'string') {
          if (embed?.color?.startsWith('#') === true) {
            embed.color = parseInt(embed?.color.slice(1), 16)
          }
        }
        await msg.edit({ embeds: [embed] })
          .then(async () => {
            await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message?.id}.properties.${key}`, true)
              .then(async () => {
                await ticketButtonsConfig(this.interaction, msg)
              })
          })
      })
      .catch(async (err) => {
        console.log(err)
        await this.interaction.editReply({ content: '❌ | Ocorreu um erro!' })
      })
  }

  public async setConfig (key: string): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isModalSubmit()) return

    const { fields, guildId, channelId, message, channel } = interaction
    const { db: dataDB } = getModalData(key)
    let messageModal = fields.getTextInputValue('content')

    if (messageModal.toLowerCase() === 'vazio') messageModal = ''

    await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message?.id}.${dataDB}`, messageModal)
    await channel?.messages.fetch(String(message?.id))
      .then(async (msg) => {
        const { embed } = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message?.id}`)
        const updateEmbed = new EmbedBuilder(embed as EmbedData)
        if (embed !== undefined && typeof embed.color === 'string') {
          if (embed.color.startsWith('#') === true) {
            updateEmbed.setColor(parseInt(embed.color.slice(1), 16))
          }
        }
        await msg.edit({ embeds: [updateEmbed] })
          .then(async () => {
            await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message?.id}.properties.${key}`, true)
              .then(async () => {
                await ticketButtonsConfig(this.interaction, msg)
                await this.interaction.editReply({ content: '✅ | Elemento ' + '`' + dataDB + '`' + ' foi alterado com sucesso!' })
              })
          })
      })
      .catch(async (err) => {
        console.log(err)
        await this.interaction.editReply({ content: '❌ | Ocorreu um erro!' })
      })
  }

  async OpenModalCollector (): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isModalSubmit()) return

    const { fields, guildId, user } = interaction
    const Constructor = new Ticket({ interaction })
    const description = fields.getTextInputValue('description')
    const userTicket = await db.tickets.get(`${guildId}.users.${user.id}`) as TicketUser
    const categories = await db.tickets.get(`${guildId}.system.categories`) as TicketCategories[] ?? []
    const title = categories.length === 0 ? fields.getTextInputValue('title') : userTicket?.preferences?.category ?? undefined

    await Constructor.create({ title, description, categoryName: userTicket?.preferences?.category })
  }

  async AddCategory ({ title, emoji }: { title?: string, emoji?: string }): Promise<void> {
    const interaction = this.interaction
    const { guildId } = interaction

    if (interaction.isModalSubmit()) {
      const { fields } = interaction
      title = fields.getTextInputValue('title')
      emoji = fields.getTextInputValue('emoji')
    }

    const categories = await db.tickets.get(`${guildId}.system.categories`) as TicketCategories[] ?? []
    const existCategory = categories.some((category) => category.title.toLowerCase() === title?.toLowerCase())

    if (existCategory) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ | Categoria ' + '`' + title + '`' + ' já existe! Tente com outro nome.'
        }).setColor('Red')]
      })
      return
    }

    await db.tickets.set(`${guildId}.system.categories`, [
      ...categories,
      { title, emoji }
    ])
      .then(async () => {
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: '✅ | Categoria ' + '`' + `${emoji} ${title}` + '`' + ', adicionada com sucesso ao sistema!'
          }).setColor('Green')]
        })
      })
      .catch(async (err) => {
        console.log(err)
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: `❌ | Ocorreu um erro ao tentar salvar a categoria ${emoji} ${title}!`
          }).setColor('Red')]
        })
      })
  }
}
