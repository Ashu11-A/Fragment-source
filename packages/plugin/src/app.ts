import {
  collectCommandActionComponents,
  type CommandManifest,
  type ComponentManifest,
  type CronManifest,
  type EventManifest,
  type PluginContext,
  type PluginManifest,
  type PluginMetadata,
  type PluginModule,
  type SubcommandGroupManifest,
  type SubcommandManifest,
} from 'discord'
import { metadata as getPackageMetadata } from 'utils'

export type {
  CommandManifest,
  ComponentManifest,
  CronManifest,
  EventManifest,
  PluginManifest,
  SubcommandGroupManifest,
  SubcommandManifest,
}

// ApplicationCommandOptionType numeric values (avoids importing discord.js at runtime)
const SUBCOMMAND = 1
const SUBCOMMAND_GROUP = 2

type RawOption = { name: string; description?: string; type?: number; options?: RawOption[] }

function extractSubcommands(options: RawOption[]): {
  subcommands: SubcommandManifest[]
  groups: SubcommandGroupManifest[]
} {
  const subcommands: SubcommandManifest[] = []
  const groups: SubcommandGroupManifest[] = []

  for (const opt of options) {
    if (opt.type === SUBCOMMAND) {
      subcommands.push({ name: opt.name, description: opt.description ?? '' })
    } else if (opt.type === SUBCOMMAND_GROUP) {
      groups.push({
        name: opt.name,
        description: opt.description ?? '',
        subcommands: (opt.options ?? [])
          .filter((sub) => sub.type === SUBCOMMAND)
          .map((sub) => ({ name: sub.name, description: sub.description ?? '' })),
      })
    }
  }

  return { subcommands, groups }
}

type PluginOptions = {
  /** Semver range of the framework version this plugin requires. Defaults to `'^1.0.0'`. */
  frameworkVersion?: string
  setup(ctx: PluginContext): Promise<void>
}

/**
 * Defines a plugin. Use `export default new Plugin({...})` in your `app.ts`.
 *
 * Metadata (name, version, description, author, license) is read automatically
 * from the plugin's `package.json`. Only `frameworkVersion` and `setup` need
 * to be provided.
 *
 * Call `plugin.inspect()` to get a side-effect-free manifest of every command,
 * component, event, cron, and entity the plugin would register.
 *
 * @example
 * import 'reflect-metadata'
 * import { Plugin } from 'plugin'
 * import { database } from '@/database/index.js'
 * import { registerAll } from '@/register.js'
 *
 * export default new Plugin({
 *   frameworkVersion: '^1.0.0',
 *   setup: async (ctx) => {
 *     ctx.registerSchema(database)
 *     await registerAll(ctx)
 *   },
 * })
 */
export class Plugin implements PluginModule {
  readonly metadata: PluginMetadata

  constructor(private readonly options: PluginOptions) {
    this.metadata = {
      ...getPackageMetadata(),
      frameworkVersion: options.frameworkVersion ?? '^1.0.0',
    }
  }

  setup(ctx: PluginContext): Promise<void> {
    return this.options.setup(ctx)
  }

  /**
   * Runs `setup()` against a dry-run context that collects registrations without
   * touching any global registry, Discord client, database, or cron scheduler.
   *
   * Safe to call multiple times and independently of the real load cycle.
   */
  async inspect(): Promise<PluginManifest> {
    const manifest: PluginManifest = {
      metadata: this.metadata,
      commands: [],
      components: [],
      events: [],
      configs: [],
      crons: [],
      entities: [],
    }

    // Dry-run context — same shape as PluginContext but has no side effects.
    // Cast is required because the real interface uses generic method signatures.
    const ctx = {
      id: 'inspect',
      metadata: this.metadata,

      // Mesmas entradas que `PluginContext.command` (Command instância ou dados planos).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      command (input: any) {
        const data = input?.data != null && typeof input.data === 'object' ? input.data : input
        const { subcommands, groups } = extractSubcommands((data?.options ?? []) as RawOption[])
        manifest.commands.push({
          name: data.name as string,
          description: data.description,
          subcommands,
          groups,
        })
        for (const c of collectCommandActionComponents(input)) {
          manifest.components.push(c)
        }
      },

      event(data: { name: string; event: string; once?: boolean }) {
        manifest.events.push({ name: data.name, event: data.event, once: data.once ?? false })
      },

      component(data: { customId: string; types: readonly string[] }) {
        manifest.components.push({ customId: data.customId, types: [...data.types] })
      },

      cron(data: { name: string; cron: string; once?: boolean }) {
        manifest.crons.push({ name: data.name, cron: data.cron, once: data.once ?? false })
      },

      registerEntity(entity: { name: string }) {
        if (!manifest.entities.includes(entity.name)) {
          manifest.entities.push(entity.name)
        }
      },

      registerSchema(schema: Record<string, { name: string }>) {
        for (const entity of Object.values(schema)) {
          if (!manifest.entities.includes(entity.name)) {
            manifest.entities.push(entity.name)
          }
        }
      },
    } as unknown as PluginContext

    await this.options.setup(ctx)
    return manifest
  }
}
