import type {
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
  ApplicationCommandSubCommandData,
  ApplicationCommandSubGroupData,
  AutocompleteInteraction,
  CacheType,
  ChatInputCommandInteraction,
  LocalizationMap,
} from 'discord.js'
import type { PluginCommandInteractionContext } from '../registries/slashCommands.js'

interface BaseApplicationCommandOptionsData {
  name: string
  nameLocalizations?: LocalizationMap
  description: string
  descriptionLocalizations?: LocalizationMap
  required?: boolean
}

export interface ConfigOptions extends Omit<BaseApplicationCommandOptionsData, 'required'> {
  type: ApplicationCommandOptionType.Subcommand
  options?: readonly Exclude<
    ApplicationCommandOptionData,
    ApplicationCommandSubGroupData | ApplicationCommandSubCommandData
  >[]
  name: string
  run: (interaction: ChatInputCommandInteraction<CacheType>) => void
  autoComplete?: (interaction: PluginCommandInteractionContext<boolean, AutocompleteInteraction>) => void
  /** Assigned by core when registered via PluginContext */
  pluginId?: string
}

export class Config {
  public static all: ConfigOptions[] = []
  constructor (data: ConfigOptions) {
    Config.all.push(data)
  }
}
