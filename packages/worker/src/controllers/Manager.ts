import { fetch } from 'bun'
import { existsSync, mkdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import SemVer from 'semver'
import type { PluginModule } from 'discord'
import { i18 } from '..'
import { PathType, type ManagerOptions, type Metadata, type MetadataKeys } from '../types/manager'

/**
 * The framework version that core exposes to plugins.
 * Plugins declare `frameworkVersion: "^1.0.0"` in their metadata;
 * Manager validates this against FRAMEWORK_VERSION before calling setup().
 */
export const FRAMEWORK_VERSION = '1.0.0'

const REQUIRED_METADATA_KEYS: MetadataKeys[] = [
  'author',
  'description',
  'license',
  'name',
  'version',
  'frameworkVersion',
]

/**
 * Loads and validates a plugin module using dynamic import().
 *
 * Replaces the old Worker + Socket.io handshake approach:
 * plugins are now plain ES modules imported directly into core's process.
 * They must export `{ metadata, setup }` matching the PluginModule interface.
 */
export class Manager {
  public metadata!: Metadata
  public module!: PluginModule
  public resolvedURL!: string

  constructor(public options: ManagerOptions) {
    if (!options.cachePath) this.options.cachePath = join(process.cwd(), '/cache')
    if (!existsSync(this.options.cachePath as string)) {
      console.log(i18('manager.cachePathNotExist'))
      mkdirSync(this.options.cachePath as string, { recursive: true })
    }
  }

  async start(): Promise<PluginModule> {
    const type = this.classifyInput(this.options.fileURL)
    if (type === PathType.Invalid) {
      throw new Error(i18('manager.invalidURL', { url: this.options.fileURL }))
    }

    switch (type) {
    case PathType.Path: {
      console.log(i18('manager.filePathDetected', { fileURL: this.options.fileURL }))
      this.resolvedURL = this.options.fileURL
      break
    }
    case PathType.URL: {
      const cachedPath = this.getCachedFilePath()
      if (existsSync(cachedPath)) {
        console.log(i18('manager.usingCachedFile', { cachedFilePath: cachedPath }))
        this.resolvedURL = cachedPath
      } else {
        console.log(i18('manager.downloadingFile', { fileURL: this.options.fileURL }))
        await this.downloadToCache(this.options.fileURL, cachedPath)
        this.resolvedURL = cachedPath
      }
      break
    }
    }

    // Cache-busting query string enables hot-reload without restarting core.
    // Bun treats each unique specifier as a separate module, bypassing the ESM cache.
    const importSpecifier = `${this.resolvedURL}?t=${Date.now()}`

    console.log(i18('manager.importing', { fileURL: this.options.fileURL }))

    try {
      this.module = await import(importSpecifier) as PluginModule
    } catch (err) {
      throw new Error(`[Manager] Failed to import plugin at "${this.options.fileURL}": ${err}`)
    }

    this.validateExports()
    this.metadata = this.module.metadata
    this.validateCompatibility()

    console.log(i18('manager.pluginInitialized'))
    return this.module
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /**
   * Structural check: the module must export `metadata` (object) and `setup` (function).
   * Missing or malformed exports fail loudly so plugin authors get clear errors.
   */
  private validateExports(): void {
    if (!this.module.metadata || typeof this.module.metadata !== 'object') {
      throw new Error(
        `[Manager] Plugin at "${this.options.fileURL}" is missing a "metadata" export.`
      )
    }

    const missingKeys = REQUIRED_METADATA_KEYS.filter(
      (key) => !(key in this.module.metadata) || (this.module.metadata as Record<string, unknown>)[key] === undefined
    )
    if (missingKeys.length > 0) {
      throw new Error(
        i18('manager.metadataMissingKeys', { missingKeys: missingKeys.join(', ') })
      )
    }

    if (typeof this.module.setup !== 'function') {
      throw new Error(
        `[Manager] Plugin at "${this.options.fileURL}" is missing a "setup" export (must be an async function).`
      )
    }
  }

  /**
   * Semver compatibility check: the plugin's declared `frameworkVersion` range
   * must be satisfied by FRAMEWORK_VERSION.
   *
   * This runs at load-time (dynamic import) and mirrors the build-time TypeScript
   * type checks that guarantee API shape compatibility.
   */
  private validateCompatibility(): void {
    const required = this.metadata.frameworkVersion

    if (!SemVer.validRange(required)) {
      throw new Error(
        `[Manager] Plugin "${this.metadata.name}" has an invalid frameworkVersion: "${required}". ` +
        'Use a valid semver range (e.g. "^1.0.0").'
      )
    }

    if (!SemVer.satisfies(FRAMEWORK_VERSION, required)) {
      throw new Error(
        `[Manager] Plugin "${this.metadata.name}" requires framework version "${required}", ` +
        `but core provides "${FRAMEWORK_VERSION}". Update the plugin or core to match.`
      )
    }
  }

  // ---------------------------------------------------------------------------
  // URL / path resolution
  // ---------------------------------------------------------------------------

  private classifyInput(input: string): PathType {
    const urlPattern = /^(https?:\/\/|ftp:\/\/|file:\/\/)[^\s]+$/i
    const pathPattern = /^([a-zA-Z]:\\|\.\/|\/|~\/|\.\.\/)[^\s]*$/

    if (urlPattern.test(input)) return PathType.URL
    if (pathPattern.test(input)) return PathType.Path
    return PathType.Invalid
  }

  private getCachedFilePath(): string {
    const fileName = this.options.fileURL.split('/').pop() as string
    const cachePath = join(this.options.cachePath as string, fileName)
    console.log(i18('manager.resolvedCachePath', { cachePath }))
    return cachePath
  }

  private async downloadToCache(url: string, cachePath: string): Promise<void> {
    console.log(i18('manager.fetchingUrl', { url }))
    const response = await fetch(url)

    if (!response.ok) {
      console.error(i18('manager.fetchFailed', { statusText: response.statusText }))
      throw new Error(response.statusText)
    }

    const buffer = await response.bytes()
    console.log(i18('manager.fetchedBlob'))
    console.log(i18('manager.savingToCache', { cachePath }))
    await writeFile(cachePath, buffer)
  }
}
