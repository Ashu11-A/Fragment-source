import Claim from './entity/Claim.entry.js';
import Config from './entity/Config.entry.js';
import Guild from './entity/Guild.entry.js';
import Template from './entity/Template.entry.js';
import Ticket from './entity/Ticket.entry.js';
export declare const database: {
    readonly ticket: typeof Ticket;
    readonly guild: typeof Guild;
    readonly claim: typeof Claim;
    readonly config: typeof Config;
    readonly template: typeof Template;
};
declare module 'database' {
    interface DatabaseRegistry {
        ticket: typeof database;
    }
}
