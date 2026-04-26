import { router } from '@/trpc.js'
import { create } from './create.js'
import { get } from './get.js'
import { list } from './list.js'

export const pluginsRouter = router({
  list,
  get,
  create,
})
