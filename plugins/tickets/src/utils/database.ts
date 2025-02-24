import Claim from '@/entity/Claim.entry.js'
import Config from '@/entity/Config.entry.js'
import Guild from '@/entity/Guild.entry.js'
import Template from '@/entity/Template.entry.js'
import Ticket from '@/entity/Ticket.entry.js'
import { Database } from 'socket-client'

export const database = {
  guild: new Database<Guild>({ table: 'Guild' }),
  config: new Database<Config>({ table: 'Config' }),
  ticket: new Database<Ticket>({ table: 'Ticket' }),
  claim: new Database<Claim>({ table: 'Claim' }),
  template: new Database<Template>({ table: 'Template' })
}