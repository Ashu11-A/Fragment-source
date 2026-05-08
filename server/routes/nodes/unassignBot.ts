import { TRPCError } from '@trpc/server'
import { adminProcedure } from '@/trpc.js'
import { Node } from '@/database/entity/Node.js'
import { assignBotNodeSchema } from './schemas.js'
import { toTrpcError } from '../_shared/errors.js'

export const unassignBotNodeProcedure = adminProcedure
  .input(assignBotNodeSchema)
  .mutation(async ({ input }) => {
    try {
      const node = await Node.findOne({ where: { id: input.nodeId }, relations: { bots: true } })
      if (!node) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Node not found.',
      })

      node.bots = node.bots.filter((bot) => bot.id !== input.botId)
      await node.save()

      return Node.findOne({ where: { id: node.id }, relations: { bots: true } })
    } catch (error) {
      throw toTrpcError(error, 'Could not unassign bot from node')
    }
  })
