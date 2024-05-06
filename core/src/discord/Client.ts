import { ApplicationCommandType, AutocompleteInteraction, BitFieldResolvable, ChatInputCommandInteraction, Client, CommandInteraction, GatewayIntentsString, IntentsBitField, MessageContextMenuCommandInteraction, Partials, UserContextMenuCommandInteraction } from "discord.js";
import { env } from "..";
import { DiscordComponent } from "./Components";
import { DiscordCommand } from "./Commands";

export class Discord {
    public static client: Client<boolean>
    constructor() {}

    async createClient () {
        Discord.client = new Client({
            intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<GatewayIntentsString, number>,
            partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User, Partials.ThreadMember],
            failIfNotExists: false,
        })
    }

    controller () {
        Discord.client.on('interactionCreate', interaction => {
            const onAutoComplete = (autoCompleteInteraction: AutocompleteInteraction): void => {
              const command = DiscordCommand.all.get(autoCompleteInteraction.commandName)
              const interaction = autoCompleteInteraction
              if (command?.type === ApplicationCommandType.ChatInput && (command.autoComplete !== undefined)) {
                command.autoComplete(interaction)
              }
            }
            const onCommand = (commandInteraction: CommandInteraction): void => {
              const command = DiscordCommand.all.get(commandInteraction.commandName)

              if (command?.run === undefined) return
        
              switch (command?.type) {
                case ApplicationCommandType.ChatInput:{
                  const interaction = commandInteraction as ChatInputCommandInteraction
                  command.run(interaction)
                  return
                }
                case ApplicationCommandType.Message:{
                  const interaction = commandInteraction as MessageContextMenuCommandInteraction
                  command.run(interaction)
                  return
                }
                case ApplicationCommandType.User:{
                  const interaction = commandInteraction as UserContextMenuCommandInteraction
                  command.run(interaction)
                }
              }
            }
            if (interaction.isCommand()) onCommand(interaction)
            if (interaction.isAutocomplete()) onAutoComplete(interaction)
        
            if (!interaction.isModalSubmit() && !interaction.isMessageComponent()) return
        
            if (interaction.isModalSubmit()) {
              const component = DiscordComponent.find(interaction.customId, 'Modal')
              component?.run(interaction); return
            }
            if (interaction.isButton()) {
              const component = DiscordComponent.find(interaction.customId, 'Button')
              component?.run(interaction); return
            }
            if (interaction.isStringSelectMenu()) {
              const component = DiscordComponent.find(interaction.customId, 'StringSelect')
              component?.run(interaction); return
            }
            if (interaction.isChannelSelectMenu()) {
              const component = DiscordComponent.find(interaction.customId, 'ChannelSelect')
              component?.run(interaction); return
            }
            if (interaction.isRoleSelectMenu()) {
              const component = DiscordComponent.find(interaction.customId, 'RoleSelect')
              component?.run(interaction); return
            }
            if (interaction.isUserSelectMenu()) {
              const component = DiscordComponent.find(interaction.customId, 'UserSelect')
              component?.run(interaction); return
            }
            if (interaction.isMentionableSelectMenu()) {
              const component = DiscordComponent.find(interaction.customId, 'MentionableSelect')
              component?.run(interaction)
            }
          })
    }

    async register () {
      const commands = Array.from(DiscordCommand.all.values())
      await Discord.client.application?.commands.set(commands)
      .then((c) => console.log(`${commands.length} Commands defined successfully!`))
      .catch((err) => console.error(err))
    }

    async start () {
        void Discord.client.login(env?.BOT_TOKEN)
        Discord.client.once('ready', async client => {
            this.controller()
            await this.register()
            console.info(`➝ Connected with ${client.user.username}`)
        })
    }
}