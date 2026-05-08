import { router } from '@/trpc.js'
import { listPlansProcedure } from './list.js'

export const plansRouter = router({
  list: listPlansProcedure,
})
