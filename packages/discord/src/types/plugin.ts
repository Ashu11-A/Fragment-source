import type { ClientEvents } from 'discord.js'
import type { CommandData } from '../controllers/Commands.js'
import type { ComponentData } from '../controllers/Components.js'
import type { ConfigOptions } from '../controllers/Config.js'
import type { CronsConfigurations } from '../controllers/Crons.js'
import type { EventData } from '../controllers/Event.js'

export type PluginMetadata = {
  name: string
  version: string
  description: string
  author: string | { name: string; email: string }
  license: string
  /**
   * Semver range of the framework version this plugin requires.
   * Example: "^1.0.0"
   */
  frameworkVersion: string
}

/**
 * Low-level database access forwarded to core's DataSource.
 * Plugin developers should use typed helpers built on top of this.
 */
export interface PluginDatabase {
  query(args: {
    type: string
    table: string
    plugin: string
    options?: unknown
    entities?: unknown
    criteria?: unknown
    partialEntity?: unknown
    entityOrEntities?: unknown
    conflictPathsOrOptions?: unknown
    where?: unknown
    entity?: unknown
  }): Promise<unknown>
}

/**
 * Context object passed to every plugin's setup() function.
 * All core capabilities are accessed through this interface —
 * plugin files must not create their own Discord connections.
 */
export interface PluginContext {
  /** Unique identifier assigned to this plugin instance by core */
  readonly id: string
  readonly metadata: PluginMetadata
  /** Direct access to core's database (proxied to core's DataSource) */
  readonly database: PluginDatabase

  /** Register a slash command or context-menu command */
  command<D extends boolean>(data: CommandData<D>): void
  /** Register a Discord event listener (attached to core's single client) */
  event<K extends keyof ClientEvents>(data: EventData<K>): void
  /** Register an interaction component handler (button, select, modal) */
  component(data: ComponentData): void
  /** Register a /config subcommand */
  config(data: ConfigOptions): void
  /** Register a cron job */
  cron<M>(data: CronsConfigurations<M>): void
  /** Register a TypeORM entity class — triggers DataSource re-initialisation */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  registerEntity(entity: Function): void
}

/**
 * Contract that every plugin module must satisfy.
 * Plugins are loaded via dynamic import(); this is what core expects to find.
 */
export interface PluginModule {
  /** Plugin metadata validated by core before setup() is called */
  metadata: PluginMetadata
  /** Called once by core to register commands, events, components, etc. */
  setup(ctx: PluginContext): Promise<void>
}
