import { EmbedBuilder, type AnySelectMenuInteraction, type ButtonInteraction, type CacheType, type ModalSubmitInteraction } from 'discord.js'
import { collectorEditButtons, collectorEditModal } from './SUEE'
import { accountCollectorButtons, accountCollectorModal } from './account'
import { cartCollectorButtons, cartCollectorModal } from './payments/cart'
import { productCollectorButtons, productCollectorModal, productCollectorSelect } from './payments/product'
import eventCollectorButtons from './events/eventCollectorButtons'
import { systemCollectorButtons } from './system/systemCollectorButtons'
import { ticketCollectorButtons, ticketCollectorSelect, ticketCollectorModal } from './tickets'
import { configCollectorButtons, configCollectorModals, configCollectorSelect } from './config'
import { db } from '@/app'

export class ButtonController {
  public readonly interaction
  public readonly key

  constructor ({ interaction, key }: {
    interaction: ButtonInteraction<CacheType> | ModalSubmitInteraction<CacheType> | AnySelectMenuInteraction<CacheType>
    key: string
  }) {
    this.interaction = interaction
    this.key = key
  }

  async product (): Promise<void> {
    const { interaction, key } = this
    const { guildId, channelId, message } = interaction

    const productData = await db.messages.get(`${guildId}.payments.${channelId}.messages.${message?.id}`)
    if (productData !== undefined || interaction.isStringSelectMenu()) {
      switch (true) {
        case interaction.isButton(): await productCollectorButtons({ interaction, key }); break
        case interaction.isModalSubmit(): await productCollectorModal({ interaction, key }); break
        case interaction.isStringSelectMenu(): await productCollectorSelect({ interaction, key })
      }
    } else {
      await interaction.reply({
        ephemeral,
        embeds: [
          new EmbedBuilder({
            title: 'Desculpe, mas as informações desse produto não estão no meu Database.'
          }).setColor('Red')
        ]
      })
    }
  }

  async SUEE (): Promise<void> {
    const { interaction, key } = this

    switch (true) {
      case interaction.isButton(): await collectorEditButtons({ interaction, key }); break
      case interaction.isModalSubmit(): await collectorEditModal({ interaction, key }); break
      case interaction.isStringSelectMenu():
    }
  }

  async cart (): Promise<void> {
    const { interaction, key } = this

    switch (true) {
      case interaction.isButton(): await cartCollectorButtons({ interaction, key }); break
      case interaction.isModalSubmit(): await cartCollectorModal({ interaction, key }); break
      case interaction.isStringSelectMenu():
    }
  }

  async event (): Promise<void> {
    const { interaction, key } = this

    switch (true) {
      case interaction.isButton(): await eventCollectorButtons({ interaction, key }); break
      case interaction.isModalSubmit(): break
      case interaction.isStringSelectMenu():
    }
  }

  async system (): Promise<void> {
    const { interaction, key } = this

    switch (true) {
      case interaction.isButton(): await systemCollectorButtons({ interaction, key }); break
      case interaction.isModalSubmit():
      case interaction.isStringSelectMenu():
    }
  }

  async ticket (): Promise<void> {
    const { interaction, key } = this

    switch (true) {
      case interaction.isButton(): await ticketCollectorButtons({ interaction, key }); break
      case interaction.isModalSubmit(): await ticketCollectorModal({ interaction, key }); break
      case interaction.isStringSelectMenu(): await ticketCollectorSelect({ interaction, key })
    }
  }

  async config (): Promise<void> {
    const { interaction, key } = this

    switch (true) {
      case interaction.isButton(): await configCollectorButtons({ interaction, key }); break
      case interaction.isModalSubmit(): await configCollectorModals({ interaction, key }); break
      case interaction.isStringSelectMenu(): await configCollectorSelect({ interaction, key })
    }
  }

  async account (): Promise<void> {
    const { interaction, key } = this

    switch (true) {
      case interaction.isButton(): await accountCollectorButtons({ interaction, key }); break
      case interaction.isModalSubmit(): await accountCollectorModal({ interaction, key }); break
      case interaction.isStringSelectMenu():
    }
  }
}
