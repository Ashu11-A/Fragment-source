import { randomUUID } from 'node:crypto'
import { adminProcedure } from '@/trpc.js'
import { Node } from '@/database/entity/Node.js'
import { createNodeSchema } from './schemas.js'
import { toTrpcError } from '../_shared/errors.js'

export const createNodeProcedure = adminProcedure
  .input(createNodeSchema)
  .mutation(async ({ input }) => {
    try {
      const node = Node.create({
        ...input,
        token: randomUUID(),
        description: input.description ?? null,
      })

      await node.save()
      return node
    } catch (error) {
      throw toTrpcError(error, 'Could not create node')
    }
  })
