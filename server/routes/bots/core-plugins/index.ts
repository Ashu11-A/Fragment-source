import { router } from '@/trpc.js'
import { list } from './list.js'
import { load } from './load.js'
import { reload } from './reload.js'
import { unload } from './unload.js'
import { upload } from './upload.js'

export const corePluginsRouter = router({
  list,
  load,
  reload,
  unload,
  upload,
})
