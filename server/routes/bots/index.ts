import { router } from '@/trpc.js'
import { activityRouter } from './activity/index.js'
import { corePluginsRouter } from './core-plugins/index.js'
import { create } from './create.js'
import { deleteBotProcedure } from './delete.js'
import { get } from './get.js'
import { list } from './list.js'
import { status } from './status.js'
import { update } from './update.js'

export const botsRouter = router({
  corePlugins: corePluginsRouter,
  activity: activityRouter,
  list,
  get,
  status,
  create,
  update,
  delete: deleteBotProcedure,
})
