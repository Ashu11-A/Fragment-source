import { Config } from '@/controller/config.js'
import { credentials } from '@/controller/crypt.js'
import { i18 } from '@/index.js'
import { ApplicationCommandType, AutocompleteInteraction, type BitFieldResolvable, ChatInputCommandInteraction, Client, CommandInteraction, type GatewayIntentsString, IntentsBitField, MessageContextMenuCommandInteraction, Partials, PermissionsBitField, UserContextMenuCommandInteraction } from 'discord.js'
import { glob } from 'glob'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Command } from './Commands.js'

export class Discord {
  public static client?: Client<boolean>
  public static isInitialized = false
  constructor () {}

  async create () {
    console.log(i18('discord.create'))
    Discord.client = new Client({
      intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<GatewayIntentsString, number>,
      partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User, Partials.ThreadMember],
      failIfNotExists: false
    })
  }

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
    if (Discord.client === undefined) await this.create()
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
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const dir = join(__dirname, '..')
    const localeCommands = await glob('commands/**/*.{ts,js}', { cwd: dir })

    for (const command of localeCommands) {
      await import(join(dir, command))
    }
    
    const commands = Array.from(Command.all.values())
    await (Discord.client as Client<boolean>).application?.commands.set(commands)
      .then(() => { console.log(i18('discord.commands', { length: commands.length })); })
      .catch((err) => { console.error(err) })
  }

  async stop () {
    if (Discord.client === undefined) await this.create()
    console.log(i18('discord.close'))
    void (Discord.client as Client<boolean>).destroy()
  }

  async start () {
    if (Discord.client?.isReady()) {
      console.log(i18('discord.isConnected'))
      return
    }

    if (Discord.client === undefined) await this.create()

    console.log(i18('discord.start'))

    await (Discord.client as Client<boolean>).login(credentials.get('token') as string);
    (Discord.client as Client<boolean>).once('ready', async (client) => {
      await new Discord().register()
      if (!Discord.isInitialized) {
        await this.controller()
        Discord.isInitialized = !Discord.isInitialized
      }
      console.info(i18('discord.connected', { botName: client.user.username }))
    })
  }
}
