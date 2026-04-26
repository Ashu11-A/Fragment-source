import { router } from '@/trpc.js'
import { cancel } from './cancel.js'
import { create } from './create.js'
import { deleteSubscriptionProcedure } from './delete.js'
import { get } from './get.js'
import { list } from './list.js'

export const subscriptionsRouter = router({
  list,
  get,
  create,
  cancel,
  delete: deleteSubscriptionProcedure,
})
