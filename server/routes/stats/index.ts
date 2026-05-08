import { router } from '@/trpc.js'
import { summaryStatsProcedure } from './summary.js'

export const statsRouter = router({
  summary: summaryStatsProcedure,
})
