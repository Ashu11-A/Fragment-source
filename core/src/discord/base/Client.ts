import { Config } from '@/controller/config.js'
import { Command } from 'discord'
import { ApplicationCommandType, AutocompleteInteraction, type BitFieldResolvable, ChatInputCommandInteraction, Client, CommandInteraction, type GatewayIntentsString, IntentsBitField, MessageContextMenuCommandInteraction, Partials, PermissionsBitField, UserContextMenuCommandInteraction } from 'discord.js'

export class Discord {
  public static client?: Client<boolean>
  public static isInitialized = false

  async controller () {
    Discord.client?.on('interactionCreate', (interaction) => {
      try {
        const onAutoComplete = (autoCompleteInteraction: AutocompleteInteraction): void => {
          const command = Command.all.get(autoCompleteInteraction.commandName)
          const interaction = autoCompleteInteraction
          if (command?.type === ApplicationCommandType.ChatInput && (command.autoComplete !== undefined)) {
            command.autoComplete(interaction)
          }
        }
        const onCommand = (commandInteraction: CommandInteraction): void => {
          const command = Command.all.get(commandInteraction.commandName)
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
      } catch (err) {
        console.log(err)
      }
    })
  }

  public async register () {
    if (Config.all.length > 0) {
      new Command({
        name: 'config',
        pluginId: '-1',
        description: '[ ⚙️ configurar ] Use esse comando para configurar o bot.',
        dmPermission: false,
        type: ApplicationCommandType.ChatInput,
        defaultMemberPermissions: PermissionsBitField.Flags.Administrator,
        options: Config.all,
        async run() {},
      })
    }
    
    const commands = Array.from(Command.all.values())
    await (Discord.client as Client<boolean>).application?.commands.set(commands)
      .then(() => { console.log(i18('discord.commands', { length: commands.length })) })
      .catch((err) => { console.error(err) })
  }

  stop () {
    if (Discord.client === undefined) return
    console.log(i18('discord.close'))
    void (Discord.client as Client<boolean>).destroy()
  }

  async start (token: string) {
    console.log(i18('discord.create'))
    Discord.client = new Client({
      intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<GatewayIntentsString, number>,
      partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User, Partials.ThreadMember],
      failIfNotExists: false
    })
  
    if (Discord.client?.isReady()) {
      console.log(i18('discord.isConnected'))
      return
    }

    console.log(i18('discord.start'))

    await (Discord.client as Client<boolean>).login(token);
    (Discord.client as Client<boolean>).once('ready', async (client) => {
      await this.register()
  
      if (!Discord.isInitialized) {
        await this.controller()
        Discord.isInitialized = !Discord.isInitialized
      }
      console.info(i18('discord.connected', { botName: client.user.username }))
    })
  }
}
