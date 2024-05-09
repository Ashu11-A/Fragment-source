import { SocketClient } from '@/controller/socket'
import { APIMessageComponentEmoji, ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, Client, IntentsBitField, Partials, type AutocompleteInteraction, type BitFieldResolvable, type ChatInputCommandInteraction, type CommandInteraction, type GatewayIntentsString, type MessageContextMenuCommandInteraction, type UserContextMenuCommandInteraction } from 'discord.js'
import { glob } from 'glob'
import { join } from 'path'
import { Command } from './Commands'
import { Component } from './Components'

export class Discord {
  public static client: Client<boolean>
  private timestamp!: number
  private username!: string
  private customId!: string
  constructor () {}

  public static async register () {
    const dir = join(__dirname, '..')
    const paths = await glob([
      'commands/**/*.{ts,js}',
      'events/**/*.{ts,js}',
      'components/**/*.{ts,js}'
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
      this.timestamp = Date.now()

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

      if (!interaction.isModalSubmit() && !interaction.isMessageComponent()) return

      this.customId = interaction.customId
      this.username = interaction.user.username

      if (interaction.isModalSubmit()) {
        const component = Component.find(interaction.customId, 'Modal')
        await component?.run(interaction)
        this.end()
        return
      }
      if (interaction.isButton()) {
        const component = Component.find(interaction.customId, 'Button')
        await component?.run(interaction)
        this.end()
        return
      }
      if (interaction.isStringSelectMenu()) {
        const component = Component.find(interaction.customId, 'StringSelect')
        await component?.run(interaction)
        this.end()
        return
      }
      if (interaction.isChannelSelectMenu()) {
        const component = Component.find(interaction.customId, 'ChannelSelect')
        await component?.run(interaction)
        this.end()
        return
      }
      if (interaction.isRoleSelectMenu()) {
        const component = Component.find(interaction.customId, 'RoleSelect')
        await component?.run(interaction)
        this.end()
        return
      }
      if (interaction.isUserSelectMenu()) {
        const component = Component.find(interaction.customId, 'UserSelect')
        await component?.run(interaction)
        this.end()
        return
      }
      if (interaction.isMentionableSelectMenu()) {
        const component = Component.find(interaction.customId, 'MentionableSelect')
        await component?.run(interaction)
        this.end()
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

    /**
   * Cria um botão de Redirecionamento
   */
    public static async buttonRedirect (options: {
      guildId: string | null
      channelId: string | undefined
      emoji?: APIMessageComponentEmoji
      label: string
    }): Promise<ActionRowBuilder<ButtonBuilder>> {
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
