import { router } from '@/trpc.js'
import { catalogArtifactsProcedure } from './catalog.js'
import { releaseListProcedure } from './releaseList.js'

export const artifactsRouter = router({
  catalog: catalogArtifactsProcedure,
  releaseList: releaseListProcedure,
})
