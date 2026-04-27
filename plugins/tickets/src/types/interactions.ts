import type { ButtonInteraction, CommandInteraction, Message, ModalSubmitInteraction, StringSelectMenuInteraction } from 'discord.js'

export type CachedInteraction =
  | CommandInteraction<'cached'>
  | ModalSubmitInteraction<'cached'>
  | ButtonInteraction<'cached'>
  | StringSelectMenuInteraction<'cached'>
  | Message<true>

export type Interaction = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'>

export type InteractionWithMessage = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'> | Message<true>
