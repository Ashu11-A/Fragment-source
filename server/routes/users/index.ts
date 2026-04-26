import { router } from '@/trpc.js'
import { create } from './create.js'
import { deleteUserProcedure } from './delete.js'
import { get } from './get.js'
import { list } from './list.js'
import { profile } from './profile.js'
import { update } from './update.js'

export const usersRouter = router({
  list,
  profile,
  get,
  create,
  update,
  delete: deleteUserProcedure,
})
