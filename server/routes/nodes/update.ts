import { TRPCError } from '@trpc/server'
import { adminProcedure } from '@/trpc.js'
import { Node } from '@/database/entity/Node.js'
import { updateNodeSchema } from './schemas.js'
import { toTrpcError } from '../_shared/errors.js'

export const updateNodeProcedure = adminProcedure
  .input(updateNodeSchema)
  .mutation(async ({ input }) => {
    try {
      const node = await Node.findOne({ where: { id: input.id }, relations: { bots: true } })
      if (!node) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Node not found.',
      })

      if (input.name !== undefined) node.name = input.name
      if (input.description !== undefined) node.description = input.description
      if (input.maintenance !== undefined) node.maintenance = input.maintenance
      if (input.location !== undefined) node.location = input.location
      if (input.memory !== undefined) node.memory = input.memory
      if (input.memoryOverAllocationPercentage !== undefined) {
        node.memoryOverAllocationPercentage = input.memoryOverAllocationPercentage
      }
      if (input.disk !== undefined) node.disk = input.disk
      if (input.diskOverAllocationPercentage !== undefined) {
        node.diskOverAllocationPercentage = input.diskOverAllocationPercentage
      }

      await node.save()
      return node
    } catch (error) {
      throw toTrpcError(error, 'Could not update node')
    }
  })
