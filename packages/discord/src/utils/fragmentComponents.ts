import {
  ButtonBuilder as DjsButtonBuilder,
  ButtonStyle,
  ModalBuilder as DjsModalBuilder,
  StringSelectMenuBuilder as DjsStringSelectMenuBuilder,
  type ActionRowBuilder,
  type ComponentEmojiResolvable,
  type SelectMenuComponentOptionData,
  type TextInputBuilder,
} from 'discord.js'
import { Package } from 'utils'

export interface BaseButtonComponentData {
  customId?: string
  style: ButtonStyle
  disabled?: boolean
  emoji?: ComponentEmojiResolvable
  label?: string
  url?: string
}

/**
 * Botão com `customId` prefixado pelo nome do plugin (`Package`), alinhado aos respondentes do ecossistema Fragment / @constatic/base.
 */
export class ButtonBuilder extends DjsButtonBuilder {
  public readonly customId?: string
  constructor ({ customId, style, label, disabled, emoji, url }: BaseButtonComponentData) {
    super()
    this.customId = customId
    this.setStyle(style)
    this.setDisabled(disabled ?? false)
    if (url === undefined) this.setCustomId(`${Package.getData().name}_${customId}`)
    else this.setURL(url)
    if (label) this.setLabel(label)
    if (emoji) this.setEmoji(emoji)
  }
}

export interface FragmentModalBuilderData {
  customId: string
  title: string
  components?: ActionRowBuilder<TextInputBuilder>[]
}

/**
 * Modal com `customId` prefixado pelo nome do plugin.
 */
export class ModalBuilder extends DjsModalBuilder {
  constructor ({ components, customId, title }: FragmentModalBuilderData) {
    super()
    this.setTitle(title)
    if (components) this.setComponents(components)
    this.setCustomId(`${Package.getData().name}_${customId}`)
  }
}

interface StringSelectMenuComponentData {
  customId: string
  options: SelectMenuComponentOptionData[]
  disabled?: boolean
  maxValues?: number
  minValues?: number
  placeholder?: string
}

/**
 * Select de string com `customId` prefixado pelo nome do plugin.
 */
export class StringSelectMenuBuilder extends DjsStringSelectMenuBuilder {
  constructor ({ customId, options, disabled, maxValues, minValues, placeholder }: StringSelectMenuComponentData) {
    super()
    this.setOptions(options)
    this.setCustomId(`${Package.getData().name}_${customId}`)
    if (disabled) this.setDisabled(disabled)
    if (maxValues) this.setMaxValues(maxValues)
    if (minValues) this.setMinValues(minValues)
    if (placeholder) this.setPlaceholder(placeholder)
  }
}
