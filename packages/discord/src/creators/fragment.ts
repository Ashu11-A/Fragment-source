import { Config, type ConfigOptions } from '../controllers/Config.js'
import { Crons, type CronsConfigurations } from '../controllers/Crons.js'

/**
 * Registers a `/config` subcommand definition (Fragment plugin registry).
 * Equivalent to `ctx.config(...)` / `new Config(data)`.
 */
export function createConfig (data: ConfigOptions): Config {
  return new Config(data)
}

/**
 * Registers a scheduled cron job (Fragment plugin registry).
 * Equivalent to `ctx.cron(...)` / `new Crons(data)`.
 */
export function createCron<Metadata = undefined> (data: CronsConfigurations<Metadata>): Crons<Metadata> {
  return new Crons(data)
}
