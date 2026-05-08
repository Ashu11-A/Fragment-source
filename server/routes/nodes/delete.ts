import { TRPCError } from '@trpc/server'
import { adminProcedure } from '@/trpc.js'
import { Node } from '@/database/entity/Node.js'
import { nodeIdSchema } from './schemas.js'
import { toTrpcError } from '../_shared/errors.js'

export const deleteNodeProcedure = adminProcedure
  .input(nodeIdSchema)
  .mutation(async ({ input }) => {
    try {
      const node = await Node.findOne({ where: { id: input.id }, relations: { bots: true } })
      if (!node) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Node not found.',
      })

      if (node.bots.length > 0) throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Node still has assigned bots and cannot be removed.',
      })

      await Node.delete({ id: node.id })

      return {
        success: true,
        id: node.id,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not remove node')
    }
  })
