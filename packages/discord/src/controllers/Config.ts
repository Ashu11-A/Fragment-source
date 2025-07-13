import type { ApplicationCommandOptionData, ApplicationCommandOptionType, ApplicationCommandSubCommandData, ApplicationCommandSubGroupData, AutocompleteInteraction, CacheType, ChatInputCommandInteraction, LocalizationMap } from 'discord.js'
import type { C } from './Commands'

interface BaseApplicationCommandOptionsData {
  name: string;
  nameLocalizations?: LocalizationMap;
  description: string;
  descriptionLocalizations?: LocalizationMap;
  required?: boolean;
}

interface ConfigOptions extends Omit<BaseApplicationCommandOptionsData, 'required'> {
  type: ApplicationCommandOptionType.Subcommand;
  options?: readonly Exclude<
    ApplicationCommandOptionData,
    ApplicationCommandSubGroupData | ApplicationCommandSubCommandData
  >[];
  name: string
  run: (interaction: ChatInputCommandInteraction<CacheType>) => void
  autoComplete?: (interaction: C<boolean, AutocompleteInteraction>) => void
}

export class Config {
  public static all: ConfigOptions[] = []
  constructor (data: ConfigOptions) {
    Config.all.push(data)
  }
}