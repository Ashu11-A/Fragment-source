import { Command, Component, Config, Event } from 'discord'
import {
  ApplicationCommandType,
  AutocompleteInteraction,
  type BitFieldResolvable,
  CacheType,
  ChatInputCommandInteraction,
  Client,
  CommandInteraction,
  type GatewayIntentsString,
  IntentsBitField,
  MessageContextMenuCommandInteraction,
  Partials,
  PermissionsBitField,
  UserContextMenuCommandInteraction,
} from 'discord.js'
import type { PluginRegistration } from 'worker'

export class Discord {
  public static client?: Client<boolean>
  public static isInitialized = false

  /**
   * Attach all interaction handlers (commands, autocomplete, components).
   * Called once when Discord.client becomes ready.
   */
  async controller(): Promise<void> {
    Discord.client?.on('interactionCreate', async (interaction) => {
      try {
        // ── Autocomplete ──────────────────────────────────────────────────
        if (interaction.isAutocomplete()) {
          const ac = interaction as AutocompleteInteraction
          if (ac.commandName === 'config') {
            const config = Config.all.find((c) => c.name === ac.options.getSubcommand())
            config?.autoComplete?.(ac)
          } else {
            const command = Command.all.get(ac.commandName)
            if (command?.type === ApplicationCommandType.ChatInput && command.autoComplete) {
              command.autoComplete(ac)
            }
          }
          return
        }

        // ── Slash / context-menu commands ─────────────────────────────────
        if (interaction.isCommand()) {
          const cmd = interaction as CommandInteraction
          if (cmd.commandName === 'config') {
            const ci = cmd as ChatInputCommandInteraction<CacheType>
            const config = Config.all.find((c) => c.name === ci.options.getSubcommand())
            config?.run(ci)
            return
          }

          const command = Command.all.get(cmd.commandName)
          if (!command?.run) return

          switch (command.type) {
          case ApplicationCommandType.ChatInput:
            command.run(cmd as ChatInputCommandInteraction)
            break
          case ApplicationCommandType.Message:
            command.run(cmd as MessageContextMenuCommandInteraction)
            break
          case ApplicationCommandType.User:
            command.run(cmd as UserContextMenuCommandInteraction)
            break
          }
          return
        }

        // ── Components (button, select, modal) ────────────────────────────
        if (!interaction.isModalSubmit() && !interaction.isMessageComponent()) return

        const customId = interaction.customId

        if (interaction.isModalSubmit()) {
          await Component.find(customId, 'Modal')?.run(interaction)
        } else if (interaction.isButton()) {
          await Component.find(customId, 'Button')?.run(interaction)
        } else if (interaction.isStringSelectMenu()) {
          await Component.find(customId, 'StringSelect')?.run(interaction)
        } else if (interaction.isChannelSelectMenu()) {
          await Component.find(customId, 'ChannelSelect')?.run(interaction)
        } else if (interaction.isRoleSelectMenu()) {
          await Component.find(customId, 'RoleSelect')?.run(interaction)
        } else if (interaction.isUserSelectMenu()) {
          await Component.find(customId, 'UserSelect')?.run(interaction)
        } else if (interaction.isMentionableSelectMenu()) {
          await Component.find(customId, 'MentionableSelect')?.run(interaction)
        }
      } catch (err) {
        console.error('[Discord] Interaction handler error:', err)
      }
    })
  }

  /** Register (or re-register) all commands from all loaded plugins */
  async register(): Promise<void> {
    if (Config.all.length > 0) {
      Command.all.set('config', {
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
    await (Discord.client as Client<boolean>).application?.commands
      .set(commands)
      .then(() => console.log(i18('discord.commands', { length: commands.length })))
      .catch((err) => console.error('[Discord] Failed to register commands:', err))
  }

  /**
   * Attach plugin event handlers from a PluginRegistration to Discord.client.
   * Called by core after each plugin's setup() completes.
   */
  attachPluginEvents(registration: PluginRegistration): void {
    if (!Discord.client) return
    for (const { name, handler, once } of registration.eventHandlers) {
      if (once) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Discord.client.once(name as any, handler as any)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Discord.client.on(name as any, handler as any)
      }
    }
  }

  /**
   * Detach plugin event handlers from Discord.client.
   * Called by core before a plugin is unloaded / hot-reloaded.
   */
  detachPluginEvents(registration: PluginRegistration): void {
    if (!Discord.client) return
    for (const { name, handler } of registration.eventHandlers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Discord.client.off(name as any, handler as any)
    }
  }

  /** Re-attach all currently registered plugin events (e.g. after Discord reconnect) */
  reattachAllEvents(): void {
    if (!Discord.client) return
    for (const event of Event.all) {
      if (event.once) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Discord.client.once(event.name as any, event.run as any)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Discord.client.on(event.name as any, event.run as any)
      }
    }
  }

  stop(): void {
    if (Discord.client === undefined) return
    console.log(i18('discord.close'))
    void (Discord.client as Client<boolean>).destroy()
  }

  async start(token: string): Promise<void> {
    console.log(i18('discord.create'))
    Discord.client = new Client({
      intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<GatewayIntentsString, number>,
      partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.User,
        Partials.ThreadMember,
      ],
      failIfNotExists: false,
    })

    if (Discord.client.isReady()) {
      console.log(i18('discord.isConnected'))
      return
    }

    console.log(i18('discord.start'))

    await (Discord.client as Client<boolean>).login(token);
    (Discord.client as Client<boolean>).once('ready', async (client) => {
      await this.register()

      if (!Discord.isInitialized) {
        await this.controller()
        // Re-attach all plugin events that were registered before Discord connected
        this.reattachAllEvents()
        Discord.isInitialized = true
      }

      console.info(i18('discord.connected', { botName: client.user.username }))
    })
  }
}
