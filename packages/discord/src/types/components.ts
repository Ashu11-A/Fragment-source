import type {
  ActionRowBuilder,
  ComponentEmojiResolvable,
  SelectMenuComponentOptionData,
  TextInputBuilder,
  ButtonStyle,
} from 'discord.js'

export interface ButtonComponentData {
  customId?: string
  style: ButtonStyle
  disabled?: boolean
  emoji?: ComponentEmojiResolvable
  label?: string
  url?: string
}

export interface ModalBuilderData {
  customId: string
  title: string
  components?: ActionRowBuilder<TextInputBuilder>[]
}

export interface StringSelectMenuData {
  customId: string
  options: SelectMenuComponentOptionData[]
  disabled?: boolean
  maxValues?: number
  minValues?: number
  placeholder?: string
}
