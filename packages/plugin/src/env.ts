/**
 * Global type registry for plugin environment variables.
 * Plugins augment this interface to get type-safe access to their env vars.
 *
 * @example
 * // In your plugin's types file:
 * declare global {
 *   namespace Fragment {
 *     interface PluginEnvVars {
 *       'TICKET_API_KEY': string
 *       'TICKET_CHANNEL_ID': string
 *     }
 *   }
 * }
 *
 * // In your plugin code:
 * const apiKey = get('API_KEY') // Typed as string | undefined
 */
export type PluginEnvVarType = 'string' | 'number' | 'boolean' | 'secret'

export type PluginEnvVarDefinition = {
  name: string
  description: string
  required?: boolean
  default?: string
  type?: PluginEnvVarType
}

/**
 * Returns the uppercase env-var prefix for a plugin.
 * Strips the "plugin-" prefix and converts to UPPER_SNAKE_CASE.
 */
export function getPluginEnvPrefix(pluginName: string): string {
  return pluginName
    .replace(/^plugin-/, '')
    .replace(/[-\s]+/g, '_')
    .toUpperCase()
}

/**
 * Builds a prefixed environment variable name.
 * Example: ("plugin-ticket", "API_KEY") → "TICKET_API_KEY"
 */
export function buildEnvVarName(pluginName: string, varName: string): string {
  return `${getPluginEnvPrefix(pluginName)}_${varName}`
}

/**
 * Type-safe environment variable getter.
 * Reads from process.env using the prefixed name.
 *
 * @example
 * const value = get('TICKET_API_KEY')
 */
export function get<K extends keyof Fragment.PluginEnvVars>(
  name: K,
): Fragment.PluginEnvVars[K] | undefined {
  return process.env[name as string] as Fragment.PluginEnvVars[K] | undefined
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Fragment {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface PluginEnvVars {}
  }
}
