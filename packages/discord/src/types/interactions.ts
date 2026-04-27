import type {
  ButtonInteraction,
  CacheType,
  ColorResolvable,
  CommandInteraction,
  Message,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js'

export type AnyInteraction =
  | CommandInteraction<CacheType>
  | ModalSubmitInteraction<CacheType>
  | ButtonInteraction<CacheType>
  | StringSelectMenuInteraction<CacheType>

export interface DiscordErrorOptions {
  interaction: AnyInteraction | Message<boolean>
  ephemeral?: boolean
  element: string
  color?: ColorResolvable
}

export type NotFoundType = 'Database' | 'Channel' | 'Message'
