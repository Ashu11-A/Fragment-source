export type Metadata = {
  name: string
  version: string
  description: string
  author: string | {
    name: string
    email: string
  }
  license: string
  /** Semver range of the framework version the plugin requires, e.g. "^1.0.0" */
  frameworkVersion: string
}

export type MetadataKeys = keyof Metadata

export type ManagerOptions = {
  fileURL: string
  cachePath?: string
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type EntityClass = Function

/**
 * Collects everything registered during a plugin's setup() call
 * so core can attach handlers and clean them up on hot-reload.
 */
export type PluginRegistration = {
  pluginName: string
  commandNames: string[]
  /** Raw event registrations — stored so they can be removed from Discord.client on unload */
  eventHandlers: Array<{ name: string; handler: (...args: unknown[]) => unknown; once: boolean }>
  componentIds: string[]
  configNames: string[]
  cronUuids: string[]
  /** TypeORM entity classes to be added to core's DataSource */
  entities: EntityClass[]
}

export enum PathType {
  URL = 'url',
  Path = 'path',
  Invalid = 'invalid'
}
