import { router } from '@/trpc.js'
import { listBotActivityProcedure } from './list.js'

export const botsActivityRouter = router({
  list: listBotActivityProcedure,
})
