import { ButtonInteraction, CommandInteraction, ModalSubmitInteraction, StringSelectMenuInteraction } from 'discord.js';
type Interaction = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'>;
export declare class Ticket {
    private readonly interaction;
    constructor({ interaction }: {
        interaction: Interaction;
    });
    delete({ channelId }: {
        channelId: string;
    }): Promise<void>;
    transcript(options: {
        messageId?: string;
        channelId?: string;
        reason?: string;
        observation?: string;
    }): Promise<void>;
}
export {};
