import Template from '@/database/entity/Template.entry.js';
import { ActionRowBuilder, EmbedBuilder, type APIEmbed as APIEmbedDiscord } from 'discord.js';
import { BaseInteractionBuilder, type CachedInteraction } from './BaseInteractionBuilder.js';
import { ButtonBuilder, StringSelectMenuBuilder } from 'discord';
import { type Properties, type Select, type System, TypeTemplate } from '@/types/entries';
interface TemplateManagerOptions {
    interaction: CachedInteraction;
    template?: Template;
}
export declare class TemplateManager extends BaseInteractionBuilder implements Record<'embeds' | 'components', unknown> {
    private options;
    private mode;
    private type;
    private properties;
    private selects;
    private systems;
    private switchToggles?;
    private data?;
    private renderedEmbed?;
    private renderedComponents?;
    constructor({ interaction, template }: TemplateManagerOptions);
    setTitle(value: string): this;
    setDescription(value: string): this;
    setThumbnail(value: string): this;
    setImage(value: string): this;
    setColor(value: string): this;
    setMode(value: 'debug' | 'production'): this;
    setType(value: TypeTemplate): this;
    setProperties(elements?: Properties): this;
    setSystem(elements?: System[]): this;
    setSelects(selects?: Select[]): this;
    switchData(data: string | string[]): this;
    setData(data: Template): this;
    renderEmbed(original?: APIEmbedDiscord): EmbedBuilder;
    renderComponents(): (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[];
    get embeds(): EmbedBuilder[] | undefined;
    get components(): (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[] | undefined;
    edit({ messageId }: {
        messageId: string;
    }): Promise<void>;
    delete({ messageId }: {
        messageId: string;
    }): Promise<void>;
}
export {};
