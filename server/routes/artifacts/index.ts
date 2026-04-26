import { router } from '@/trpc.js'
import { catalog } from './catalog.js'
import { releaseList } from './releaseList.js'

export const artifactsRouter = router({
  catalog,
  releaseList,
})
