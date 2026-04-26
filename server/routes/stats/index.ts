import { router } from '@/trpc.js'
import { summary } from './summary.js'

export const statsRouter = router({
  summary,
})
