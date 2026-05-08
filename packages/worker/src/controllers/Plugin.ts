import { createPluginContext } from '@/controllers/Context'
import { Manager } from '@/controllers/Manager'
import { Watcher } from '@/controllers/Watcher'
import { i18 } from '@/index'
import type { PluginCallbacks, PluginEntry, RegisterResult } from '@/types/plugin.js'
import chalk from 'chalk'
import { unregisterDatabase } from 'database'
import type { PluginManifest } from 'discord'
import { Crons, unregisterCommand } from 'discord/registries'
import { existsSync, mkdirSync } from 'fs'
import { readdir } from 'fs/promises'
import ora from 'ora'
import { basename, join } from 'path'
import SemVer from 'semver'

export type { PluginCallbacks, PluginEntry, RegisterResult } from '@/types/plugin.js'

export class Plugin {
  /** All currently loaded plugins keyed by their name (metadata.name) */
  static readonly all = new Map<string, PluginEntry>()

  /**
   * Returns the `PluginManifest` for every loaded plugin that was defined with
   * `new Plugin({...})`. Plugins using the legacy `export { metadata, setup }`
   * format will not have a manifest and are excluded from the result.
   */
  static manifests(): PluginManifest[] {
    return [...Plugin.all.values()]
      .filter((e): e is PluginEntry & { manifest: PluginManifest } => e.manifest !== undefined)
      .map((e) => e.manifest)
  }

  constructor(private readonly callbacks: PluginCallbacks = {}) {}

  /**
   * Absolute paths to every `plugin-*.js` under `./plugins` (sorted by filename).
   */
  public async list (): Promise<string[]> {
    const dir = join(process.cwd(), 'plugins')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
      return []
    }

    let names: string[] = []
    try {
      names = await readdir(dir)
    } catch {
      return []
    }

    return names
      .filter((n) => n.endsWith('.js') && n.startsWith('plugin-'))
      .sort()
      .map((n) => join(dir, n))
  }

  /**
   * Loads every `plugin-*.js` bundle already present under `./plugins` (sorted by filename).
   * Call this **before** Discord bootstrap so slash commands, events, components, configs and crons
   * from plugins are in the shared registries when the client connects.
   */
  public async load (): Promise<void> {
    const paths = await this.list()
    if (paths.length === 0) return

    console.log('\n' + chalk.cyan('◆') + ' ' + chalk.bold('Plugins'))
    for (const filePath of paths) {
      const r = await this.register(filePath)
      if (!r.ok) {
        console.error(chalk.red(`[plugins] ${basename(filePath)}: ${r.error}`))
      }
    }
    console.log(chalk.dim(`\n  ${paths.length} plugin${paths.length === 1 ? '' : 's'} loaded`))
  }

  /**
   * Unloads every plugin currently in memory (registries cleared, DB hooks run).
   */
  public async unloadAll (): Promise<void> {
    const ids = [...Plugin.all.keys()]
    for (const id of ids) {
      await this.unload(id)
    }
  }

  /**
   * Full reload: unload all plugins, then import every `plugin-*.js` from `./plugins` from disk
   * (does not require plugins to have been loaded before).
   */
  public async reloadAll (): Promise<Array<{ filePath: string; pluginName?: string; error?: string }>> {
    await this.unloadAll()
    const paths = await this.list()
    const results: Array<{ filePath: string; pluginName?: string; error?: string }> = []
    if (paths.length === 0) return results

    console.log('\n' + chalk.cyan('◆') + ' ' + chalk.bold('Plugins') + ' ' + chalk.dim('(full reload)'))
    for (const filePath of paths) {
      const r = await this.register(filePath)
      if (r.ok) {
        results.push({ filePath, pluginName: r.pluginName })
      } else {
        results.push({ filePath, error: r.error })
      }
    }
    console.log(chalk.dim(`\n  ${paths.length} plugin${paths.length === 1 ? '' : 's'} loaded`))
    return results
  }

  /**
   * Watch `./plugins` for new/changed bundles. Uses `ignoreInitial: true` so files already loaded
   * via {@link load} are not registered again.
   */
  public watcher (): void {
    const onChange = async (filePath: string) => {
      const name = basename(filePath)
      if (!name.endsWith('.js') || !name.startsWith('plugin-')) return

      console.log(chalk.cyan('  >') + '  ' + chalk.dim('New plugin detected'))
      const r = await this.register(filePath)
      if (!r.ok) {
        console.error(chalk.red(`[watcher] ${basename(filePath)}: ${r.error}`))
      }
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
  async register(filePath: string): Promise<RegisterResult> {
    const existing = [...Plugin.all.values()].find((e) => e.fileURL === filePath)
    if (existing) {
      console.log(chalk.yellow('  ⚠') + '  ' + chalk.yellow('Hot-reloading: ') + chalk.dim(basename(filePath)))
      await this.unload(existing.pluginName)
    }

    const manager = new Manager({ fileURL: filePath })

    // Tracks whether setup() ran so we can clean up the schema on failure.
    let schemaKey: string | undefined
    const spin = ora({ text: chalk.dim(basename(filePath)), color: 'cyan', spinner: 'dots' }).start()

    try {
      await manager.start()

      const { ctx, registration } = createPluginContext(manager.metadata)

      await manager.module.setup(ctx)
      schemaKey = manager.metadata.name.replace(/^plugin-/, '')

      this.validateDependencies(manager)

      const pluginName = manager.metadata.name
      const manifest = await manager.module.inspect?.()
      Plugin.all.set(pluginName, { manager, registration, manifest, fileURL: filePath, pluginName })

      const version = manager.metadata.version ?? '?'

      spin.stopAndPersist({
        symbol: chalk.green('  ✓'),
        text: chalk.bold.cyan(pluginName) + chalk.dim(`@${version}`),
      })

      console.log(chalk.green('    >') + '  ' + i18('plugins.commands',   { length: String(registration.commandNames.length) }))
      console.log(chalk.green('    >') + '  ' + i18('plugins.components', { length: String(registration.componentIds.length) }))
      console.log(chalk.green('    >') + '  ' + i18('plugins.events',     { length: String(registration.eventHandlers.length) }))
      console.log(chalk.green('    >') + '  ' + i18('plugins.configs',    { length: String(registration.configNames.length) }))
      console.log(chalk.green('    >') + '  ' + i18('plugins.crons',      { length: String(registration.cronUuids.length) }))

      if (this.callbacks.onPluginLoaded) {
        await this.callbacks.onPluginLoaded(pluginName, registration)
      }

      return { ok: true, pluginName, filePath }
    } catch (error) {
      if (schemaKey) unregisterDatabase(schemaKey)

      const errMsg = String(error instanceof Error ? error.message : error)
      const errDetails = error instanceof Error ? error.stack : undefined
      spin.fail(chalk.red(`Failed to load ${basename(filePath)}`))
      console.error(chalk.dim(errMsg))
      return { ok: false, filePath, error: errMsg, details: errDetails }
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
   * Unload a plugin by its name (metadata.name).
   *
   * Removes all registered commands, events, components, configs and crons
   * from the shared registries. Core's onPluginUnloaded callback is called first
   * so Discord.client event listeners can be detached cleanly.
   */
  async unload(pluginName: string): Promise<void> {
    const entry = Plugin.all.get(pluginName)
    if (!entry) return

    if (this.callbacks.onPluginUnloaded) {
      await this.callbacks.onPluginUnloaded(pluginName, entry.registration)
    }

    const { registration } = entry

    for (const name of registration.commandNames) {
      unregisterCommand(name)
    }

    for (const uuid of registration.cronUuids) {
      const timeout = Crons.timeouts.get(uuid)
      if (timeout) clearTimeout(timeout)
      Crons.timeouts.delete(uuid)
      const idx = Crons.all.findIndex((c) => c.uuid === uuid)
      if (idx !== -1) Crons.all.splice(idx, 1)
    }

    Plugin.all.delete(pluginName)

    console.log(chalk.yellow('  ○') + '  ' + chalk.dim(`Plugin unloaded: ${pluginName}`))
  }

}
