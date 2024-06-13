import { Database } from "@/controller/database.js";
import Claim from "@/entity/Claim.entry.js";
import Config from "@/entity/Config.entry.js";
import Ticket from "@/entity/Ticket.entry.js";

export const ticketDB = new Database<Ticket>({ table: 'Ticket' })
export const claimDB = new Database<Claim>({ table: 'Claim' })
export const configDB = new Database<Config>({ table: 'Config' })