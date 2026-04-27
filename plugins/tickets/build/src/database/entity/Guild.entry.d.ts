import { BaseEntity, type Relation } from 'typeorm';
import Template from './Template.entry';
import Ticket from './Ticket.entry';
import Config from './Config.entry';
export default class Guild extends BaseEntity {
    id: number;
    guildId: string;
    tickets: Relation<Ticket>[];
    templates: Relation<Template>[];
    configs: Relation<Config>;
}
