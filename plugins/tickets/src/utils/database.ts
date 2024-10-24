import Claim from '@/entity/Claim.entry.js'
import Config from '@/entity/Config.entry.js'
import Guild from '@/entity/Guild.entry.js'
import Template from '@/entity/Template.entry.js'
import Ticket from '@/entity/Ticket.entry.js'
import { Database } from 'socket-client'

export const guildDB = new Database<Guild>({ table: 'Guild' })
export const ticketDB = new Database<Ticket>({ table: 'Ticket' })
export const claimDB = new Database<Claim>({ table: 'Claim' })
export const configDB = new Database<Config>({ table: 'Config' })
export const templateDB = new Database<Template>({ table: 'Template' })