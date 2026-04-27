import { BaseEntity, type Relation } from 'typeorm';
import Guild from './Guild.entry';
export interface Roles {
    id: string;
    name: string;
}
export default class Config extends BaseEntity {
    id: number;
    guild: Relation<Guild>;
    claimLimit?: number;
    limit?: number;
    claimId?: string;
    logsId?: string;
    roles?: Roles[];
}
