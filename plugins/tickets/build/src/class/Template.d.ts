import { BaseInteractionBuilder, type CachedInteraction } from './BaseInteractionBuilder.js';
interface TicketOptions {
    interaction: CachedInteraction;
}
interface TicketCreate {
    title: string;
    description: string;
    channelId: string;
    guildId: string;
}
export declare class Template extends BaseInteractionBuilder {
    constructor({ interaction }: TicketOptions);
    create({ title, description, channelId, guildId }: TicketCreate): Promise<void>;
}
export {};
