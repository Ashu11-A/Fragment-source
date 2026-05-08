import { router } from '@/trpc.js'
import { assignBotNodeProcedure } from './assignBot.js'
import { createNodeProcedure } from './create.js'
import { deleteNodeProcedure } from './delete.js'
import { getNodeProcedure } from './get.js'
import { listNodesProcedure } from './list.js'
import { resetNodeTokenProcedure } from './resetToken.js'
import { unassignBotNodeProcedure } from './unassignBot.js'
import { updateNodeProcedure } from './update.js'

export const nodesRouter = router({
  get: getNodeProcedure,
  list: listNodesProcedure,
  create: createNodeProcedure,
  update: updateNodeProcedure,
  remove: deleteNodeProcedure,
  assignBot: assignBotNodeProcedure,
  unassignBot: unassignBotNodeProcedure,
  resetToken: resetNodeTokenProcedure,
})
