import { ActionRowBuilder, BaseSelectMenuComponentData, ButtonBuilder as Button, ButtonStyle, ComponentEmojiResolvable, ComponentType, ModalBuilder as Modal, SelectMenuComponentOptionData, StringSelectMenuBuilder as StringSelect, TextInputBuilder } from "discord.js";
import { name } from '../../../package.json';

export interface BaseButtonComponentData {
  customId: string
  style: ButtonStyle
  disabled?: boolean
  emoji?: ComponentEmojiResolvable
  label?: string
}

export class ButtonBuilder extends Button {
  public readonly customId: string
  constructor ({ customId, style, label, disabled, emoji }: BaseButtonComponentData) {
    super()
    this.customId = customId
    this.setStyle(style)
    this.setDisabled(disabled ?? false)
    this.setCustomId(`${name}_${customId}`)
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
    this.setCustomId(`${name}_${customId}`)
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
    this.setCustomId(`${name}_${customId}`)
    if (disabled) this.setDisabled(disabled)
    if (maxValues) this.setMaxValues(maxValues)
    if (minValues) this.setMinValues(minValues)
    if (placeholder) this.setPlaceholder(placeholder)
  }
}