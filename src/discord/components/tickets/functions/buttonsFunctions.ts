import { db } from '@/app'
import { type TicketCategories, type TicketUser } from '@/interfaces/Ticket'
import { ActionRowBuilder, type ButtonInteraction, type CacheType, type CommandInteraction, EmbedBuilder, ModalBuilder, type ModalSubmitInteraction, type SelectMenuComponentOptionData, StringSelectMenuBuilder, type StringSelectMenuInteraction, type TextChannel, TextInputBuilder, TextInputStyle } from 'discord.js'
import { getModalData } from './getModalData'
import { Ticket } from './ticket'
import { buttonsUsers, ticketButtonsConfig } from './ticketUpdateConfig'

interface TicketType {
  interaction: CommandInteraction<CacheType> | ButtonInteraction<CacheType> | StringSelectMenuInteraction | ModalSubmitInteraction<CacheType>
}
export class TicketButtons implements TicketType {
  interaction
  constructor ({ interaction }: TicketType) {
    this.interaction = interaction
  }

  async OpenModal (): Promise<void> {
    const interaction = this.interaction
    if (interaction.isModalSubmit()) return
    const { guildId } = interaction
    const categories = await db.tickets.get(`${guildId}.system.categories`) as TicketCategories[] ?? []

    const modal = new ModalBuilder({ customId: '-1_User_Ticket_OpenModalCollector', title: 'Abrir novo ticket' })

    if (categories.length === 0) {
      modal.components.push(
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder({
          customId: 'title',
          label: 'Qual é o motivo do ticket?',
          required,
          maxLength: 150,
          style: TextInputStyle.Short,
          placeholder: 'Dúvida... Denúncia... Pedido...'
        }))
      )
    }
    modal.components.push(
      new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder({
        customId: 'description',
        label: 'Qual a descrição?',
        required: false,
        maxLength: 255,
        style: TextInputStyle.Paragraph,
        placeholder: 'Queria saber mais informações sobre...'
      }))
    )
    await interaction.showModal(modal)
  }

  public async setSystem (options: {
    type: 'select' | 'button' | 'modal'
  }): Promise<void> {
    if (!this.interaction.isButton()) return
    const { guildId, message, channelId } = this.interaction
    const { type } = options

    await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message.id}.properties.SetSelect`, type === 'select')
    await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message.id}.properties.SetButton`, type === 'button')
    await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message.id}.properties.SetModal`, type === 'modal')
    await this.interaction.editReply({ content: '⏱️ | Aguarde só um pouco...' })
    await ticketButtonsConfig(this.interaction, message)
  }

  public async sendSave (key: string): Promise<void> {
    const { guild, guildId, channelId } = this.interaction
    const { label, maxLength, placeholder, style, title, type, db: dataDB } = getModalData(key)

    if (this.interaction.isButton()) {
      try {
        const { message, customId } = this.interaction
        const { embedChannelID: channelEmbedID, embedMessageID: messageID } = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message?.id}`)
        const channel = guild?.channels.cache.get(channelEmbedID) as TextChannel
        const msg = await channel?.messages.fetch(messageID)

        if (typeof channelEmbedID === 'string' && messageID !== undefined) {
          await buttonsUsers(this.interaction, message.id, msg)
        } else {
          const textValue = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message.id}.${dataDB}`)
          const modal = new ModalBuilder({ customId, title })
          const content = new ActionRowBuilder<TextInputBuilder>({
            components: [
              new TextInputBuilder({
                custom_id: 'content',
                label,
                placeholder,
                value: textValue ?? null,
                style,
                required: true,
                maxLength,
                type
              })
            ]
          })
          modal.setComponents(content)
          await this.interaction.showModal(modal)
        }
      } catch (err) {
        console.log(err)
        await this.interaction.editReply({ content: '❌ | Ocorreu um erro, tente mais tarde!' })
      }
    }
  }

  async RemCategory (): Promise<void> {
    const interaction = this.interaction
    if (interaction.isModalSubmit()) return
    const { guildId } = interaction
    const categories = await db.tickets.get(`${guildId}.system.categories`) as TicketCategories[] ?? []

    if (categories.length === 0) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Não existem categorias para os tickets!'
        }).setColor('Red')]
      })
      return
    }

    const options: SelectMenuComponentOptionData[] = []

    for (const category of categories) {
      if (options.some((option) => option.value === category.title)) continue // Se houver valores clonados
      options.push({
        label: category.title,
        value: category.title,
        emoji: category.emoji
      })
    }
    const row = new ActionRowBuilder<StringSelectMenuBuilder>({
      components: [
        new StringSelectMenuBuilder({
          customId: '-1_Admin_Ticket_RemCategory',
          placeholder: 'Selecione as Categorias a serem deletadas!',
          minValues: 1,
          maxValues: options.length,
          options
        })
      ]
    })
    await interaction.editReply({
      components: [row]
    })
  }

  async SelectType (): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isButton()) return
    const { guildId, channelId, message, user } = interaction
    const categories = await db.tickets.get(`${guildId}.system.categories`) as TicketCategories[] ?? []
    const userTicket = await db.tickets.get(`${guildId}.users.${user.id}`) as TicketUser
    const data = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message.id}`)
    const Constructor = new Ticket({ interaction })
    const ButtonsConstructor = new TicketButtons({ interaction })

    if (categories.length === 0) {
      data?.properties?.SetModal === true
        ? await ButtonsConstructor.OpenModal()
        : await Constructor.create({ title: 'Não foi possível descobrir.', categoryName: 'Tickets' })
      return
    }

    const options: SelectMenuComponentOptionData[] = []

    for (const category of categories) {
      options.push({
        label: category.title,
        value: `${category.emoji}-${category.title}-${data?.properties?.SetModal === true ? 'modal' : 'button'}`,
        emoji: category.emoji,
        description: userTicket?.preferences?.category === category.title ? 'Seu último ticket aberto foi nessa categoria!' : undefined
      })
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>({
      components: [new StringSelectMenuBuilder({
        customId: '-1_Admin_Ticket_SelectType',
        placeholder: 'Selecione a categoria do seu Ticket',
        minValues: 1,
        maxValues: 1,
        options
      })]
    })

    await interaction.editReply({
      components: [row]
    })
  }
}
