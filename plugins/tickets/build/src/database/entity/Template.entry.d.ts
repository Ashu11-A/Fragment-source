import { TypeTemplate, type Category, type Properties, type Select, type System } from '@/types/entries.js';
import { type APIEmbed } from 'discord.js';
import { BaseEntity, type Relation } from 'typeorm';
import Guild from './Guild.entry.js';
export default class Template extends BaseEntity {
    id: number;
    guild: Relation<Guild>;
    tickets: Relation<Template>[];
    messageId: string;
    channelId: string;
    type: TypeTemplate;
    selects: Select[];
    categories: Category[];
    embed: APIEmbed;
    properties: Properties;
    systems: System[];
    createAt: Date;
    updateAt: Date;
}
