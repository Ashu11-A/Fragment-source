import { SocketClient } from '@/controller/socket'
import { ApplicationCommandType, type AutocompleteInteraction, type BitFieldResolvable, type ChatInputCommandInteraction, Client, type CommandInteraction, type GatewayIntentsString, IntentsBitField, type MessageContextMenuCommandInteraction, Partials, type UserContextMenuCommandInteraction } from 'discord.js'
import { DiscordCommand } from './Commands'
import { DiscordComponent } from './Components'

export class Discord {
  public static client: Client<boolean>
  constructor () {}

  async create () {
    Discord.client = new Client({
      intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<GatewayIntentsString, number>,
      partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User, Partials.ThreadMember],
      failIfNotExists: false
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

  async start () {
    await Discord.client.login(SocketClient.key)
    Discord.client.once('ready', async client => {
      this.controller()
      console.info(`➝ Connected with ${client.user.username}`)
    })
  }
}
