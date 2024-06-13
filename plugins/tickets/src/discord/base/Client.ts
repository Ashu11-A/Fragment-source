import { console } from '@/controller/console.js'
import { Database } from '@/controller/database.js'
import { SocketClient } from '@/controller/socket.js'
import Guild from '@/entity/Guild.entry.js'
import ConfigEntry from '@/entity/Config.entry.js'
import { APIMessageComponentEmoji, ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, CacheType, Client, IntentsBitField, Partials, type AutocompleteInteraction, type BitFieldResolvable, type ChatInputCommandInteraction, type CommandInteraction, type GatewayIntentsString, type MessageContextMenuCommandInteraction, type UserContextMenuCommandInteraction } from 'discord.js'
import { glob } from 'glob'
import { dirname, join } from 'path'
import { Command } from './Commands.js'
import { Component } from './Components.js'
import { Config } from './Config.js'
import { fileURLToPath } from 'url'
import { packageData } from '@/index.js'
export class Discord {
  public static client: Client<boolean>
  private timestamp!: number
  private username!: string
  private customId!: string
  constructor () {}

  public static async register () {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const dir = join(__dirname, '..')
    const paths = await glob([
      'commands/**/*.{ts,js}',
      'events/**/*.{ts,js}',
      'components/**/*.{ts,js}',
      'configs/**/*.{ts,js}'
    ], { cwd: dir })
  
    for (const path of paths) {
      await import (join(dir, path))
    }
  }

  async create () {
    Discord.client = new Client({
      intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<GatewayIntentsString, number>,
      partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User, Partials.ThreadMember],
      failIfNotExists: false
    })
  }

  end () {
    const endTime = Date.now()
    const timeSpent = (endTime - this.timestamp) / 1000 + 's'
    console.info(`${this?.customId} | ${timeSpent} | ${this.username}`)
  }

  controller () {
    Discord.client.on('interactionCreate', async (interaction) => {
      try {
        this.timestamp = Date.now()

        const onAutoComplete = (autoCompleteInteraction: AutocompleteInteraction): void => {
          console.log(autoCompleteInteraction.commandName)
          if (autoCompleteInteraction.commandName === 'config') {
            const config = Config.all.find((config) => config.name === autoCompleteInteraction.options.getSubcommand())
            if (config?.autoComplete !== undefined) config.autoComplete(autoCompleteInteraction)
            return
          }
          const command = Command.all.get(autoCompleteInteraction.commandName)
          const interaction = autoCompleteInteraction
          if (command?.type === ApplicationCommandType.ChatInput && (command.autoComplete !== undefined)) {
            command.autoComplete(interaction)
          }
        }
        const onCommand = (commandInteraction: CommandInteraction): void => {
          if (commandInteraction.commandName === 'config') {
            const interaction = commandInteraction as ChatInputCommandInteraction<CacheType>
            const config = Config.all.find((config) => config.name === interaction.options.getSubcommand())
            config?.run(interaction)
            return
          }
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

        if (!interaction.isModalSubmit() && !interaction.isMessageComponent()) return

        if (interaction.customId.split('_')[0] !== packageData.name) return

        this.customId = interaction.customId
        this.username = interaction.user.username

        if (interaction.isModalSubmit()) {
          const component = Component.find(this.customId, 'Modal')
          await component?.run(interaction)
        }
        if (interaction.isButton()) {
          const component = Component.find(this.customId, 'Button')
          await component?.run(interaction)
        }
        if (interaction.isStringSelectMenu()) {
          const component = Component.find(this.customId, 'StringSelect')
          await component?.run(interaction)
        }
        if (interaction.isChannelSelectMenu()) {
          const component = Component.find(this.customId, 'ChannelSelect')
          await component?.run(interaction)
        }
        if (interaction.isRoleSelectMenu()) {
          const component = Component.find(this.customId, 'RoleSelect')
          await component?.run(interaction)
        }
        if (interaction.isUserSelectMenu()) {
          const component = Component.find(this.customId, 'UserSelect')
          await component?.run(interaction)
        }
        if (interaction.isMentionableSelectMenu()) {
          const component = Component.find(this.customId, 'MentionableSelect')
          await component?.run(interaction)
        }
        if (this.customId) this.end()
      } catch (err) {
        console.error(err)
      }
    })
  }

  async start () {
    await Discord.client.login(SocketClient.key)
    Discord.client.once('ready', async client => {
      this.controller()
      console.info(`➝ Connected with ${client.user.username}`)
      const guildClass = new Database<Guild>({ table: 'Guild' })
      const config = new Database<ConfigEntry>({ table: 'Config' })
      for (const [guildId, guild] of client.guilds.cache) {

        if (await guildClass.findOne({ where: { guildId: guildId } }) !== null) {
          console.log(`Servidor ${guild.name} está registrado no banco de dados!`)
          continue
        }
        
        const result = await guildClass.save(await guildClass.create({ guildId: guildId })) as Guild
        await config.save(await config.create({ guild: { id: result.id } }))
      }
    })
  }

  /**
   * Cria um botão de Redirecionamento
   */
  public static buttonRedirect (options: {
      guildId: string | null
      channelId: string | undefined
      emoji?: APIMessageComponentEmoji
      label: string
    }): ActionRowBuilder<ButtonBuilder> {
    const { guildId, channelId, emoji, label } = options
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder({
        emoji,
        label,
        url: `https://discord.com/channels/${guildId}/${channelId}`,
        style: ButtonStyle.Link
      })
    )
  }
}
