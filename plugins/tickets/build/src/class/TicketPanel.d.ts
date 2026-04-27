import { ButtonInteraction, CommandInteraction, ModalSubmitInteraction, StringSelectMenuInteraction } from 'discord.js';
type Interaction = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'>;
export declare class TicketPanel {
    private readonly interaction;
    constructor({ interaction }: {
        interaction: Interaction;
    });
    validator(): Promise<boolean>;
    CreateCall(): Promise<void>;
    AddUser(): Promise<void>;
    RemoveUser(): Promise<void>;
}
export {};
