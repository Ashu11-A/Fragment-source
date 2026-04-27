import { BaseEntity, type Relation } from 'typeorm';
import Ticket from './Ticket.entry';
export default class Claim extends BaseEntity {
    id: number;
    ticket: Relation<Ticket>;
    channelId: string;
    messageId: string;
}
