import {
  type ApplicationCommandData,
  type ApplicationCommandType,
  type AutocompleteInteraction,
  type CacheType,
  type ChatInputCommandInteraction,
  Collection,
  type CommandInteraction,
  type MessageContextMenuCommandInteraction,
  type UserContextMenuCommandInteraction,
} from 'discord.js'

/** Narrow interaction typing for autocomplete / command runners (discord.js only). */
export type PluginCommandInteractionContext<
  DmPermission extends boolean,
  I extends CommandInteraction | AutocompleteInteraction,
> =
  I extends ChatInputCommandInteraction
    ? DmPermission extends false ? ChatInputCommandInteraction<CacheType> : ChatInputCommandInteraction
    : I extends UserContextMenuCommandInteraction
      ? DmPermission extends false ? UserContextMenuCommandInteraction<CacheType> : UserContextMenuCommandInteraction
      : I extends MessageContextMenuCommandInteraction
        ? DmPermission extends false ? MessageContextMenuCommandInteraction<CacheType> : MessageContextMenuCommandInteraction
        : I extends AutocompleteInteraction
          ? DmPermission extends false ? AutocompleteInteraction<CacheType> : AutocompleteInteraction
          : never

type SlashCommandProps<DmPermission extends boolean> =
  | {
    type: ApplicationCommandType.ChatInput
    autoComplete?: (interaction: PluginCommandInteractionContext<DmPermission, AutocompleteInteraction>) => void
    run: (interaction: PluginCommandInteractionContext<DmPermission, ChatInputCommandInteraction>) => void
  }
  | {
    type: ApplicationCommandType.User
    run: (interaction: PluginCommandInteractionContext<DmPermission, UserContextMenuCommandInteraction>) => void
  }
  | {
    type: ApplicationCommandType.Message
    run: (interaction: PluginCommandInteractionContext<DmPermission, MessageContextMenuCommandInteraction>) => void
  }

/**
 * Slash / context-menu commands registered by plugins for core’s interaction router.
 * Prefer `createCommand` from `@constatic/base` for new code; this map backs legacy `ctx.command`.
 */
export type PluginSlashCommandData<DmPermission extends boolean> = SlashCommandProps<DmPermission> &
ApplicationCommandData & {
  dmPermission: DmPermission
  pluginId?: string
}

export const slashCommands = new Collection<string, PluginSlashCommandData<boolean>>()
