import { randomUUID } from 'node:crypto'
import { TRPCError } from '@trpc/server'
import { adminProcedure } from '@/trpc.js'
import { Node } from '@/database/entity/Node.js'
import { nodeIdSchema } from './schemas.js'
import { toTrpcError } from '../_shared/errors.js'

export const resetNodeTokenProcedure = adminProcedure
  .input(nodeIdSchema)
  .mutation(async ({ input }) => {
    try {
      const node = await Node.findOne({ where: { id: input.id } })
      if (!node) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Node not found.',
        })
      }

      const token = randomUUID()
      node.token = token
      await node.save()

      return { token }
    } catch (error) {
      throw toTrpcError(error, 'Could not reset node token')
    }
  })
