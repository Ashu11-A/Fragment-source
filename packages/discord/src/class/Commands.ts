import { type ApplicationCommandData, type ApplicationCommandType, type AutocompleteInteraction, type CacheType, type ChatInputCommandInteraction, Collection, type CommandInteraction, type MessageContextMenuCommandInteraction, type UserContextMenuCommandInteraction } from 'discord.js'

export type C<B extends boolean, I extends CommandInteraction | AutocompleteInteraction> =
I extends ChatInputCommandInteraction
  ? B extends false ? ChatInputCommandInteraction<CacheType> : ChatInputCommandInteraction
  : I extends UserContextMenuCommandInteraction
    ? B extends false ? UserContextMenuCommandInteraction<CacheType> : UserContextMenuCommandInteraction
    : I extends MessageContextMenuCommandInteraction
      ? B extends false ? MessageContextMenuCommandInteraction<CacheType> : MessageContextMenuCommandInteraction
      : I extends AutocompleteInteraction
        ? B extends false ? AutocompleteInteraction<CacheType> : AutocompleteInteraction
        : never

type CommandProps<DmPermission extends boolean> =
{
  type: ApplicationCommandType.ChatInput
  autoComplete?: (interaction: C<DmPermission, AutocompleteInteraction>) => void
  run: (interaction: C<DmPermission, ChatInputCommandInteraction>) => void
} | {
  type: ApplicationCommandType.User
  run: (interaction: C<DmPermission, UserContextMenuCommandInteraction>) => void
} | {
  type: ApplicationCommandType.Message
  run: (interaction: C<DmPermission, MessageContextMenuCommandInteraction>) => void
}

type CommandData<DmPermission extends boolean> = CommandProps<DmPermission> & ApplicationCommandData & {
  dmPermission: DmPermission
}

export class Command<DmPermission extends boolean = boolean> {
  public static all = new Collection<string, CommandData<boolean>>()
  constructor (data: CommandData<DmPermission>) {
    Command.all.set(data.name, data)
  }
}
