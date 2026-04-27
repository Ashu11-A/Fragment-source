import Claim from '@/database/entity/Claim.entry.js';
import Ticket from '@/database/entity/Ticket.entry.js';
import { ActionRowBuilder, ButtonBuilder as DjsButtonBuilder, ButtonInteraction, CommandInteraction, EmbedBuilder, Message, ModalSubmitInteraction, StringSelectMenuInteraction } from 'discord.js';
type Interaction = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'> | Message<true>;
export declare class ClaimBuilder {
    private readonly interaction;
    private options;
    private ticketData;
    embed: EmbedBuilder | undefined;
    buttons: ActionRowBuilder<DjsButtonBuilder>[] | undefined;
    constructor({ interaction }: {
        interaction: Interaction;
    });
    setTicketId(ticketId: number): this;
    setData(ticket: Ticket): this;
    private permissions;
    render(): Promise<this>;
    create(): Promise<Claim | Claim[] | undefined>;
    edit({ messageId }: {
        messageId: string;
    }): Promise<void>;
    delete(id: number): Promise<void | this>;
}
export {};
