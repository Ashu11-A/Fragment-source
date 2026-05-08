import { router } from '@/trpc.js'
import { botsActivityRouter } from './activity/index.js'
import { botsCorePluginsRouter } from './core-plugins/index.js'
import { botsPluginsRouter } from './plugins/index.js'
import { createBotProcedure } from './create.js'
import { deleteBotProcedure } from './delete.js'
import { getBotProcedure } from './get.js'
import { initializeBotProcedure } from './initialize.js'
import { listBotsProcedure } from './list.js'
import { statusBotsProcedure } from './status.js'
import { updateBotProcedure } from './update.js'
import { setDiscordTokenProcedure } from './token.js'
import { deleteBotEnvVarProcedure, getBotEnvVarsProcedure, setBotEnvVarsProcedure } from './envVars.js'

export const botsRouter = router({
  get: getBotProcedure,
  initialize: initializeBotProcedure,
  status: statusBotsProcedure,
  list: listBotsProcedure,
  create: createBotProcedure,
  update: updateBotProcedure,
  delete: deleteBotProcedure,
  activity: botsActivityRouter,
  corePlugins: botsCorePluginsRouter,
  plugins: botsPluginsRouter,
  token: router({
    set: setDiscordTokenProcedure,
  }),
  envs: router({
    get: getBotEnvVarsProcedure,
    set: setBotEnvVarsProcedure,
    delete: deleteBotEnvVarProcedure,
  }),
})
