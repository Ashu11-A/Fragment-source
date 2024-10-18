import { packageData, ActionDrawer } from 'utils'
import { ButtonBuilder as Button, ButtonStyle, ComponentType, EmbedBuilder, ModalBuilder as Modal, StringSelectMenuBuilder as StringSelect, type ActionRowBuilder, type ButtonInteraction, type CacheType, type CommandInteraction, type ComponentEmojiResolvable, type ModalSubmitInteraction, type SelectMenuComponentOptionData, type StringSelectMenuInteraction, type TextInputBuilder } from 'discord.js'

export interface BaseButtonComponentData {
  customId?: string
  style: ButtonStyle
  disabled?: boolean
  emoji?: ComponentEmojiResolvable
  label?: string
  url?: string
}

export class ButtonBuilder extends Button {
  public readonly customId?: string
  constructor ({ customId, style, label, disabled, emoji, url }: BaseButtonComponentData) {
    super()
    this.customId = customId
    this.setStyle(style)
    this.setDisabled(disabled ?? false)
    if (url === undefined) this.setCustomId(`${packageData.name}_${customId}`)
    else if (url !== undefined) this.setURL(url)
    if (label) this.setLabel(label)
    if (emoji) this.setEmoji(emoji)
  }
}

export interface APIModalInteractionResponseCallbackData {
  /**
   * A developer-defined identifier for the component, max 100 characters
   */
  customId: string;
  /**
   * The title of the popup modal
   */
  title: string;
  /**
   * Between 1 and 5 (inclusive) components that make up the modal
   */
  components?: ActionRowBuilder<TextInputBuilder>[]
}

export class ModalBuilder extends Modal {
  constructor({ components, customId, title }: APIModalInteractionResponseCallbackData) {
    super()
    this.setTitle(title)
    if (components) this.setComponents(components)
    this.setCustomId(`${packageData.name}_${customId}`)
  }
}

interface StringSelectMenuComponentData {
  customId: string;
  options: SelectMenuComponentOptionData[];
  disabled?: boolean;
  maxValues?: number;
  minValues?: number;
  placeholder?: string;
}

export class StringSelectMenuBuilder extends StringSelect {
  constructor({ customId, options, disabled, maxValues, minValues, placeholder }: StringSelectMenuComponentData) {
    super()
    this.setOptions(options)
    this.setCustomId(`${packageData.name}_${customId}`)
    if (disabled) this.setDisabled(disabled)
    if (maxValues) this.setMaxValues(maxValues)
    if (minValues) this.setMinValues(minValues)
    if (placeholder) this.setPlaceholder(placeholder)
  }
}

type Interaction = CommandInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ButtonInteraction<CacheType> | StringSelectMenuInteraction<CacheType>
export class YouSure {
  private readonly interaction: Interaction
  private readonly title?: string
  constructor ({ interaction, title }: { interaction: Interaction, title: string }) {
    this.interaction = interaction
    this.title = title
  }

  async question () {
    const embed = new EmbedBuilder({ title: this.title ?? 'Tem certeza que deseja fazer isso?' }).setColor('Orange')
    const buttons = ActionDrawer([
      new Button({ customId: 'confirm-button', label: 'Confirmar', style: ButtonStyle.Success }),
      new Button({ customId: 'cancel-button', label: 'Cancelar', style: ButtonStyle.Danger })
    ])
    const message = this.interaction.deferred
      ? await this.interaction.editReply({ embeds: [embed], components: buttons })
      : await this.interaction.reply({ embeds: [embed], components: buttons })

    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, maxUsers: 1 })
    collector.once('collect', async (subInteraction) => {
      switch (subInteraction.customId) {
      case 'confirm-button': {
        return true
      }
      case 'cancel-button': {
        if (subInteraction.isRepliable()) {
          const embed = new EmbedBuilder({
            title: 'Ação cancelada!'
          }).setColor('Red')
          await subInteraction.update({ embeds: [embed], components: [] }).catch(async () => {
            if (subInteraction.deferred) { await this.interaction.editReply({ embeds: [embed], components: [] }); return }
            await this.interaction.reply({ ephemeral: true, embeds: [embed], components: [] })
          })
          setTimeout(async () => await subInteraction.deleteReply().catch(() => undefined), 5000)
        }
        return false
      }
      }
    })
  }
}