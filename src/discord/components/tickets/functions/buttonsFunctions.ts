import { db } from '@/app'
import { ActionRowBuilder, type ButtonInteraction, type CacheType, type CommandInteraction, ModalBuilder, type ModalSubmitInteraction, type StringSelectMenuInteraction, type TextChannel, TextInputBuilder, TextInputStyle } from 'discord.js'
import { getModalData } from './getModalData'
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

    const modal = new ModalBuilder({ customId: '-1_User_Ticket_OpenModalCollector', title: 'Abrir novo ticket' })
    modal.components.push(
      new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder({
        customId: 'title',
        label: 'Qual é o motivo do ticket?',
        required,
        maxLength: 150,
        style: TextInputStyle.Short,
        placeholder: 'Dúvida... Denúncia... Pedido...'
      })),
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
}
