import Claim from './entity/Claim.entry.js'
import Config from './entity/Config.entry.js'
import Guild from './entity/Guild.entry.js'
import Template from './entity/Template.entry.js'
import Ticket from './entity/Ticket.entry.js'

export const database = {
  ticket: Ticket,
  guild: Guild,
  claim: Claim,
  config: Config,
  template: Template,
} as const

declare module 'database' {
  interface DatabaseRegistry {
    ticket: typeof database
  }
}
