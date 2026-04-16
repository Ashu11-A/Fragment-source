import { readdir } from 'fs/promises'
import { basename, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import SemVer from 'semver'
import chalk from 'chalk'
import ora from 'ora'
import { unregisterDatabase } from 'database'
import { unregisterPluginSlashCommandFromConstatic } from 'discord'
import {
  Config,
  Crons,
  discordEventListeners,
  interactionComponents,
  slashCommands,
} from 'discord/registries'
import { i18 } from '..'
import { Manager } from './Manager'
import { createPluginContext } from './Context'
import { Watcher } from './Watcher'
import type { PluginRegistration } from '../types/manager.js'

type PluginEntry = {
  manager: Manager
  registration: PluginRegistration
  fileURL: string
  pluginId: string
}

type PluginCallbacks = {
  /** Invoked after setup() completes — use to attach Discord events and register entities */
  onPluginLoaded?: (pluginId: string, registration: PluginRegistration) => Promise<void>
  /** Invoked before a plugin is unloaded — use to detach Discord events */
  onPluginUnloaded?: (pluginId: string, registration: PluginRegistration) => Promise<void>
}

let nextPluginId = 0

export class Plugin {
  /** All currently loaded plugins keyed by their unique pluginId */
  static readonly all = new Map<string, PluginEntry>()

  constructor(private readonly callbacks: PluginCallbacks = {}) {}

  /**
   * Loads every `plugin-*.js` bundle already present under `./plugins` (sorted by filename).
   * Call this **before** Discord bootstrap so slash commands, events, components, configs and crons
   * from plugins are in the shared registries when the client connects.
   */
  public async loadExistingBundles (): Promise<void> {
    const dir = join(process.cwd(), 'plugins')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
      return
    }

    let names: string[] = []
    try {
      names = await readdir(dir)
    } catch {
      return
    }

    const paths = names
      .filter((n) => n.endsWith('.js') && n.startsWith('plugin-'))
      .sort()
      .map((n) => join(dir, n))

    if (paths.length === 0) return

    console.log('\n' + chalk.cyan('◆') + ' ' + chalk.bold('Plugins'))
    for (const filePath of paths) {
      await this.register(filePath)
    }
    console.log(chalk.dim(`\n  ${paths.length} plugin${paths.length === 1 ? '' : 's'} loaded`))
  }

  /**
   * Watch `./plugins` for new/changed bundles. Uses `ignoreInitial: true` so files already loaded
   * via {@link loadExistingBundles} are not registered again.
   */
  public watcher (): void {
    const onChange = async (filePath: string) => {
      const name = basename(filePath)
      if (!name.endsWith('.js') || !name.startsWith('plugin-')) return

      console.log(chalk.cyan('  >') + '  ' + chalk.dim('New plugin detected'))
      await this.register(filePath)
    }

    console.log('\n' + chalk.cyan('◆') + ' ' + chalk.bold('Watcher') + '  ' + chalk.dim('watching ./plugins'))
    new Watcher({ onChange, ignoreInitial: true })
  }

  /**
   * Load (or hot-reload) a plugin from `filePath`.
   *
   * Flow:
   * 1. Unload the previous version if this path was already registered.
   * 2. Dynamic-import the plugin module (cache-busted for hot-reload).
   * 3. Validate exports and semver compatibility.
   * 4. Run plugin.setup(ctx) — populates commands, events, entities, etc.
   * 5. Invoke onPluginLoaded so core can attach events and reinitialise the DB.
   */
  async register(filePath: string): Promise<string | undefined> {
    const existing = [...Plugin.all.values()].find((e) => e.fileURL === filePath)
    if (existing) {
      console.log(chalk.yellow('  ⚠') + '  ' + chalk.yellow('Hot-reloading: ') + chalk.dim(basename(filePath)))
      await this.unload(existing.pluginId)
    }

    const pluginId = `plugin_${nextPluginId++}`

    const manager = new Manager({ fileURL: filePath })

    // Tracks whether setup() ran so we can clean up the schema on failure.
    let schemaKey: string | undefined
    const spin = ora({ text: chalk.dim(basename(filePath)), color: 'cyan', spinner: 'dots' }).start()

    try {
      await manager.start()

      const { ctx, registration } = createPluginContext(
        pluginId,
        manager.metadata
      )

      await manager.module.setup(ctx)
      schemaKey = manager.metadata.name.replace(/^plugin-/, '')

      this.validateDependencies(manager)

      Plugin.all.set(pluginId, { manager, registration, fileURL: filePath, pluginId })

      const name = manager.metadata.name
      const version = manager.metadata.version ?? '?'

      spin.stopAndPersist({
        symbol: chalk.green('  ✓'),
        text: chalk.bold.cyan(name) + chalk.dim(`@${version}`),
      })

      console.log(chalk.green('    >') + '  ' + i18('plugins.commands',   { length: String(registration.commandNames.length) }))
      console.log(chalk.green('    >') + '  ' + i18('plugins.components', { length: String(registration.componentIds.length) }))
      console.log(chalk.green('    >') + '  ' + i18('plugins.events',     { length: String(registration.eventHandlers.length) }))
      console.log(chalk.green('    >') + '  ' + i18('plugins.configs',    { length: String(registration.configNames.length) }))
      console.log(chalk.green('    >') + '  ' + i18('plugins.crons',      { length: String(registration.cronUuids.length) }))

      if (this.callbacks.onPluginLoaded) {
        await this.callbacks.onPluginLoaded(pluginId, registration)
      }

      return pluginId
    } catch (error) {
      if (schemaKey) unregisterDatabase(schemaKey)

      spin.fail(chalk.red(`Failed to load ${basename(filePath)}`))
      console.error(chalk.dim(String(error instanceof Error ? error.message : error)))
      return undefined
    }
  }

  /**
   * Validates that all declared database dependencies are loaded and version-compatible.
   *
   * Semver diff rules (compared against the version captured at build time):
   *   - patch → silent (backward-compatible fix)
   *   - minor → warn  (new features, old queries still work)
   *   - major → error (breaking schema change — halt loading)
   */
  private validateDependencies(manager: Manager): void {
    const deps = manager.metadata.dependencies
    if (!deps || deps.length === 0) return

    for (const dep of deps) {
      // Find a loaded plugin whose key (name stripped of "plugin-" prefix) matches
      const loaded = [...Plugin.all.values()].find(
        (e) => e.manager.metadata.name.replace(/^plugin-/, '') === dep.name
      )

      if (!loaded) {
        throw new Error(
          `[Plugin] "${manager.metadata.name}" requires plugin "${dep.name}" ` +
          `to be loaded before it. Load "${dep.name}" first.`
        )
      }

      const loadedVersion = loaded.manager.metadata.version
      const reqMajor = SemVer.major(dep.version)
      const loadMajor = SemVer.major(loadedVersion)

      if (reqMajor !== loadMajor) {
        throw new Error(
          `[Plugin] "${manager.metadata.name}" depends on "${dep.name}@${dep.version}" ` +
          `but the loaded version is "${loadedVersion}". ` +
          'MAJOR version mismatch — database schema breaking change. ' +
          'Update both plugins to use the same major version.'
        )
      }

      const reqMinor = SemVer.minor(dep.version)
      const loadMinor = SemVer.minor(loadedVersion)

      if (reqMinor !== loadMinor) {
        console.warn(
          `[Plugin] "${manager.metadata.name}" depends on "${dep.name}@${dep.version}" ` +
          `but the loaded version is "${loadedVersion}". ` +
          'MINOR version mismatch — some database columns or tables may be unavailable.'
        )
      }
      // Patch diff → fully compatible, no action needed
    }
  }

  /**
   * Unload a plugin by its pluginId.
   *
   * Removes all registered commands, events, components, configs and crons
   * from the shared registries. Core's onPluginUnloaded callback is called first
   * so Discord.client event listeners can be detached cleanly.
   */
  async unload(pluginId: string): Promise<void> {
    const entry = Plugin.all.get(pluginId)
    if (!entry) return

    if (this.callbacks.onPluginUnloaded) {
      await this.callbacks.onPluginUnloaded(pluginId, entry.registration)
    }

    const { registration } = entry

    for (const name of registration.commandNames) {
      slashCommands.delete(name)
      unregisterPluginSlashCommandFromConstatic(name)
    }

    for (let i = discordEventListeners.length - 1; i >= 0; i--) {
      const e = discordEventListeners[i]
      if (e?.pluginId === pluginId) discordEventListeners.splice(i, 1)
    }

    for (let i = interactionComponents.length - 1; i >= 0; i--) {
      const c = interactionComponents[i]
      if (c?.pluginId === pluginId) interactionComponents.splice(i, 1)
    }

    Config.all = Config.all.filter((c) => c.pluginId !== pluginId)

    for (const uuid of registration.cronUuids) {
      const timeout = Crons.timeouts.get(uuid)
      if (timeout) clearTimeout(timeout)
      Crons.timeouts.delete(uuid)
      const idx = Crons.all.findIndex((c) => c.uuid === uuid)
      if (idx !== -1) Crons.all.splice(idx, 1)
    }

    Plugin.all.delete(pluginId)

    console.log(chalk.yellow('  ○') + '  ' + chalk.dim(`Plugin unloaded: ${entry.manager.metadata.name ?? pluginId}`))
  }

}
