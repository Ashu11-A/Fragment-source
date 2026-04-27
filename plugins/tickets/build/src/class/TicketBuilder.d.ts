import Ticket, { type Event, type History, type TicketCategories, type Message as TicketMessage, type TicketType, type User as UserTicket, type Voice } from '@/database/entity/Ticket.entry.js';
import { ButtonBuilder } from 'discord';
import { ActionRowBuilder, ButtonInteraction, CommandInteraction, EmbedBuilder, Message, ModalSubmitInteraction, type OverwriteResolvable, StringSelectMenuInteraction, User } from 'discord.js';
type Interaction = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'> | Message<true>;
export declare class TicketBuilder {
    options: TicketType;
    embed?: EmbedBuilder;
    buttons?: ActionRowBuilder<ButtonBuilder>[];
    private user;
    private channelId?;
    private ticketId?;
    private templateId?;
    private readonly interaction;
    constructor({ interaction }: {
        interaction: Interaction;
    });
    setData(data: Ticket): this;
    setTicket(channelId: string): this;
    setTemplateId(id: number): this;
    setOwner(id: string): this;
    setTitle(content: string): this;
    setDescription(content: string): this;
    setClosed(isClosed: boolean): this;
    setVoice(voice: Voice): this;
    setCategory(category: TicketCategories): this;
    setUser(user: User): this;
    addTeam(user: UserTicket): this;
    addUsers(user: UserTicket): this;
    addEvent(event: Event): this;
    addHistory(content: History): this;
    addMessage(message: TicketMessage): this;
    permissions(): OverwriteResolvable[];
    render(): this;
    create(): Promise<Ticket | null | undefined | void>;
    loader(): Promise<this>;
    delete(options?: {
        reason?: string;
        observation?: string;
    }): Promise<void>;
    edit(): Promise<this>;
    send(embeds: EmbedBuilder[]): Promise<this | undefined>;
    update(): Promise<this | undefined>;
}
export {};
