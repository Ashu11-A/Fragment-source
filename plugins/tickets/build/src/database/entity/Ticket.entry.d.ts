import { BaseEntity, type Relation } from 'typeorm';
import Claim from './Claim.entry';
import Template from './Template.entry';
import Guild from './Guild.entry';
export interface User {
    name: string;
    displayName: string;
    id: string;
}
export interface History {
    role: string;
    user: {
        id: string;
        name: string;
    };
    message: {
        id: string;
        content: string;
    };
    date: Date;
    deleted: boolean;
}
export interface Event {
    user: {
        id: string;
        name: string;
    };
    message: string;
    date: Date;
}
export interface Message {
    channelId: string;
    messageId: string;
}
export interface TicketCategories {
    title: string;
    emoji: string;
}
export interface Voice {
    id: string;
    messageId: string;
}
export interface TicketType {
    ownerId?: string;
    title?: string;
    description?: string;
    closed: boolean;
    channelId?: string;
    messageId?: string;
    claim?: Message;
    voice?: Voice;
    category: TicketCategories;
    team: User[];
    users: User[];
    history: History[];
    messages: Message[];
    events: Event[];
}
export default class Ticket extends BaseEntity {
    id: number;
    guild: Relation<Guild>;
    template: Relation<Template>;
    ownerId: string;
    title: string;
    description: string;
    closed: boolean;
    channelId: string;
    messageId: string;
    claim: Relation<Claim>;
    voice: Voice;
    users: User[];
    team: User[];
    category: TicketCategories;
    messages: Message[];
    events: Event[];
    history: History[];
    updateAt: Date;
    createAt: Date;
}
