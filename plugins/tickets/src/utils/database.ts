import Claim from '@/entity/Claim.entry.js'
import Config from '@/entity/Config.entry.js'
import Guild from '@/entity/Guild.entry.js'
import Template from '@/entity/Template.entry.js'
import Ticket from '@/entity/Ticket.entry.js'
import { Database } from 'socket-client'

const guild = new Database<Guild>({ table: 'Guild' })
const config = new Database<Config>({ table: 'Config' })
const ticket = new Database<Ticket>({ table: 'Ticket' })
const claim = new Database<Claim>({ table: 'Claim' })
const template = new Database<Template>({ table: 'Template' })

export const database = {
  guild,
  config,
  ticket,
  claim,
  template
}