import { router } from '@/trpc.js'
import { cancelSubscriptionProcedure } from './cancel.js'
import { createSubscriptionProcedure } from './create.js'
import { deleteSubscriptionProcedure } from './delete.js'
import { getSubscriptionProcedure } from './get.js'
import { listSubscriptionsProcedure } from './list.js'
import { upgradeSubscriptionProcedure } from './upgrade.js'

export const subscriptionsRouter = router({
  get: getSubscriptionProcedure,
  list: listSubscriptionsProcedure,
  create: createSubscriptionProcedure,
  cancel: cancelSubscriptionProcedure,
  upgrade: upgradeSubscriptionProcedure,
  deleteSubscriptionProcedure: deleteSubscriptionProcedure,
})
