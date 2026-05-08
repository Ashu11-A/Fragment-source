import { TRPCError } from '@trpc/server'
import { adminProcedure } from '@/trpc.js'
import { Node } from '@/database/entity/Node.js'
import { nodeIdSchema } from './schemas.js'
import { toTrpcError } from '../_shared/errors.js'

export const getNodeProcedure = adminProcedure
  .input(nodeIdSchema)
  .query(async ({ input }) => {
    try {
      const node = await Node.findOne({ where: { id: input.id }, relations: { bots: true } })
      if (!node) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Node not found.',
      })

      return node
    } catch (error) {
      throw toTrpcError(error, 'Could not fetch node')
    }
  })
