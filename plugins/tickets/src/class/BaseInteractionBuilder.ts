import { ButtonInteraction, CommandInteraction, Guild, GuildBasedChannel, Message, ModalSubmitInteraction, StringSelectMenuInteraction, User, type BaseMessageOptions, type TextBasedChannel } from 'discord.js'
import { DiscordError } from 'discord'
import type { CachedInteraction } from '@/types/interactions.js'

export type { CachedInteraction }

export abstract class BaseInteractionBuilder<T extends CachedInteraction = CachedInteraction> {
  protected readonly interaction: T
  protected user: User
  protected guild: Guild

  constructor ({ interaction }: { interaction: T }) {
    this.interaction = interaction

    if (interaction instanceof Message) {
      this.user = interaction.author
      this.guild = interaction.guild
    } else {
      this.user = interaction.user
      this.guild = interaction.guild
    }
  }

  protected get isDeferred(): boolean {
    if (this.interaction instanceof Message) return false
    return (this.interaction as Exclude<T, Message<true>>).deferred
  }

  protected get isComponentInteraction(): boolean {
    return (
      this.interaction instanceof ButtonInteraction ||
      this.interaction instanceof StringSelectMenuInteraction
    )
  }

  protected async validateTextChannel (channelId: string): Promise<(GuildBasedChannel & TextBasedChannel) | null> {
    const channel = await this.guild.channels.fetch(channelId)
    if (channel?.isTextBased() !== true) {
      await new DiscordError({ element: channelId, interaction: this.interaction }).notFound({ type: 'Channel' }).reply()
      return null
    }
    return channel as GuildBasedChannel & TextBasedChannel
  }

  protected async handleInteractionResponse (content: BaseMessageOptions): Promise<void> {
    if (this.interaction instanceof Message) return

    if (this.isComponentInteraction) {
      const componentInteraction = this.interaction as ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'>
      await componentInteraction.update(content)
      return
    }

    if (this.isDeferred) {
      await this.interaction.editReply(content)
      return
    }

    await this.interaction.reply(content)
  }
}
