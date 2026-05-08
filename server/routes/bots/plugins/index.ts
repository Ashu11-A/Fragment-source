import { router } from '@/trpc.js'
import { assignBotPluginProcedure } from './assign.js'
import { getVariablesProcedure, setVariablesProcedure } from './variables.js'
import { installBotPluginProcedure } from './install.js'
import { listBotPluginsProcedure } from './list.js'
import { unassignBotPluginProcedure } from './unassign.js'

export const botsPluginsRouter = router({
  list: listBotPluginsProcedure,
  assign: assignBotPluginProcedure,
  install: installBotPluginProcedure,
  unassign: unassignBotPluginProcedure,
  variables: router({
    get: getVariablesProcedure,
    set: setVariablesProcedure,
  }),
})
