import { router } from '@/trpc.js'
import { createUserProcedure } from './create.js'
import { deleteUserProcedure } from './delete.js'
import { getUserProcedure } from './get.js'
import { listUsersProcedure } from './list.js'
import { profileProcedure } from './profile.js'
import { updateUserProcedure } from './update.js'

export const usersRouter = router({
  get: getUserProcedure,
  list: listUsersProcedure,
  profile: profileProcedure,
  create: createUserProcedure,
  update: updateUserProcedure,
  deleteUserProcedure: deleteUserProcedure,
})
