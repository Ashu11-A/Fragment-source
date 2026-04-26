import { router } from '@/trpc.js'
import { list } from './list.js'

export const activityRouter = router({
  list,
})
