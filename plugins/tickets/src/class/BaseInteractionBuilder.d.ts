import { ButtonInteraction, CommandInteraction, Guild, GuildBasedChannel, Message, ModalSubmitInteraction, StringSelectMenuInteraction, User, type BaseMessageOptions, type TextBasedChannel } from 'discord.js';
type ReplyContent = BaseMessageOptions;
export type CachedInteraction = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'> | Message<true>;
export declare abstract class BaseInteractionBuilder<T extends CachedInteraction = CachedInteraction> {
    protected readonly interaction: T;
    protected user: User;
    protected guild: Guild;
    constructor({ interaction }: {
        interaction: T;
    });
    protected get isDeferred(): boolean;
    protected get isComponentInteraction(): boolean;
    protected validateTextChannel(channelId: string): Promise<(GuildBasedChannel & TextBasedChannel) | null>;
    protected handleInteractionResponse(content: ReplyContent): Promise<void>;
}
export {};
