import { router } from '@/trpc.js'
import { listCorePluginsProcedure } from './list.js'
import { loadCorePluginProcedure } from './load.js'
import { reloadCorePluginProcedure } from './reload.js'
import { unloadCorePluginProcedure } from './unload.js'
import { uploadCorePluginProcedure } from './upload.js'

export const botsCorePluginsRouter = router({
  list: listCorePluginsProcedure,
  load: loadCorePluginProcedure,
  unload: unloadCorePluginProcedure,
  reload: reloadCorePluginProcedure,
  upload: uploadCorePluginProcedure,
})
