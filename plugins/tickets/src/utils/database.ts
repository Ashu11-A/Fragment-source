import type { PluginContext } from 'discord'
import type Claim from '@/entity/Claim.entry.js'
import type Config from '@/entity/Config.entry.js'
import type Guild from '@/entity/Guild.entry.js'
import type Template from '@/entity/Template.entry.js'
import type Ticket from '@/entity/Ticket.entry.js'

/**
 * Typed database helpers backed by core's DataSource via PluginContext.
 * Replaces the socket-based Database class from socket-client.
 */
function makeTable<T>(ctx: PluginContext, table: string) {
  const plugin = ctx.metadata.name

  return {
    find: (options?: unknown) =>
      ctx.database.query({ type: 'find', table, plugin, options }) as Promise<T[]>,

    findOne: (options?: unknown) =>
      ctx.database.query({ type: 'findOne', table, plugin, options }) as Promise<T | null>,

    save: (entities: T | T[], options?: unknown) =>
      ctx.database.query({ type: 'save', table, plugin, entities, options }) as Promise<T | T[]>,

    create: (entity: Partial<T>) =>
      ctx.database.query({ type: 'create', table, plugin, entity }) as Promise<T>,

    delete: (criteria: unknown) =>
      ctx.database.query({ type: 'delete', table, plugin, criteria }),

    update: (criteria: unknown, partialEntity: Partial<T>) =>
      ctx.database.query({ type: 'update', table, plugin, criteria, partialEntity }),

    count: (options?: unknown) =>
      ctx.database.query({ type: 'count', table, plugin, options }) as Promise<number>,

    findBy: (where: unknown) =>
      ctx.database.query({ type: 'findBy', table, plugin, where }) as Promise<T[]>,
  }
}

export function createDatabase(ctx: PluginContext) {
  return {
    guild: makeTable<Guild>(ctx, 'Guild'),
    config: makeTable<Config>(ctx, 'Config'),
    ticket: makeTable<Ticket>(ctx, 'Ticket'),
    claim: makeTable<Claim>(ctx, 'Claim'),
    template: makeTable<Template>(ctx, 'Template'),
  }
}

/** @deprecated Use createDatabase(ctx) instead */
export const database = null as unknown as ReturnType<typeof createDatabase>
