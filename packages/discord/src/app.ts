export * from './utils/index.js'
export * from './types/plugin.js'

import { bootstrap as startDiscord } from '@constatic/base'
export * from '@constatic/base'
export * from '@magicyan/discord'

export { createCommand, createEvent, createResponder } from './constatic/creatorsInstance.js'
export { startDiscord }

/** Fábricas createConfig/createCron; registros de plugin (slashCommands, …) em `discord/registries`. */
export { createConfig, createCron } from './creators/fragment.js'
export { Config, type ConfigOptions } from './controllers/Config.js'
export {
  Crons,
  type CronsConfigurations,
  type CronsConfigurationsSystem,
  type UniqueCron,
} from './controllers/Crons.js'
export {
  registerPluginSlashCommandInConstatic,
  unregisterPluginSlashCommandFromConstatic,
} from './constatic/slashBridge.js'