import { adminProcedure } from '@/trpc.js'
import { Node } from '@/database/entity/Node.js'
import { toTrpcError } from '../_shared/errors.js'

export const listNodesProcedure = adminProcedure
  .query(async () => {
    try {
      return Node.find({
        relations: { bots: true },
        order: { id: 'ASC' },
      })
    } catch (error) {
      throw toTrpcError(error, 'Could not list nodes')
    }
  })
