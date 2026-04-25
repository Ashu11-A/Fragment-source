import { ButtonInteraction, CommandInteraction, Guild, GuildBasedChannel, Message, ModalSubmitInteraction, StringSelectMenuInteraction, User, type BaseMessageOptions, type TextBasedChannel } from 'discord.js'
import { Error } from 'discord'

type ReplyContent = BaseMessageOptions

/** Tipos de interação suportadas pelos builders */
export type CachedInteraction =
  | CommandInteraction<'cached'>
  | ModalSubmitInteraction<'cached'>
  | ButtonInteraction<'cached'>
  | StringSelectMenuInteraction<'cached'>
  | Message<true>

/**
 * Classe base abstrata que centraliza lógica compartilhada entre todos os builders.
 * Fornece resolução de usuário, acesso ao guild e utilitários de validação.
 */
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

  /** Retorna true se a interação está em estado diferido (deferReply) */
  protected get isDeferred(): boolean {
    if (this.interaction instanceof Message) return false
    return (this.interaction as Exclude<T, Message<true>>).deferred
  }

  /** Retorna true se a interação suporta update (MessageComponentInteraction) */
  protected get isComponentInteraction(): boolean {
    return (
      this.interaction instanceof ButtonInteraction ||
      this.interaction instanceof StringSelectMenuInteraction
    )
  }

  /**
   * Busca um canal pelo ID e valida que é text-based.
   * Envia resposta de erro e retorna null se não encontrado ou inválido.
   */
  protected async validateTextChannel (channelId: string): Promise<(GuildBasedChannel & TextBasedChannel) | null> {
    const channel = await this.guild.channels.fetch(channelId)
    if (channel?.isTextBased() !== true) {
      await new Error({ element: channelId, interaction: this.interaction }).notFound({ type: 'Channel' }).reply()
      return null
    }
    return channel as GuildBasedChannel & TextBasedChannel
  }

  /**
   * Responde à interação considerando o estado atual (deferred, component ou fresh).
   */
  protected async handleInteractionResponse (content: ReplyContent): Promise<void> {
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

  /** @deprecated Use handleInteractionResponse */
  protected async safeReply (content: ReplyContent): Promise<void> {
    return this.handleInteractionResponse(content)
  }

  /** Retorna o usuário que originou a interação */
  getUser (): User {
    return this.user
  }

  /** Retorna o guild da interação */
  getGuild (): Guild {
    return this.guild
  }

  /** Retorna a interação original */
  getInteraction (): T {
    return this.interaction
  }
}
