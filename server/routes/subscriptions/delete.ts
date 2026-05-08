import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { adminProcedure } from '@/trpc.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { toTrpcError } from '../_shared/errors.js'

const deleteSubscriptionSchema = z.object({
  id: z.number().int().positive(),
})

export const deleteSubscriptionProcedure = adminProcedure
  .input(deleteSubscriptionSchema)
  .mutation(async ({ input }) => {
    try {
      const subscription = await Subscription.findOne({ where: { id: input.id } })
      if (!subscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Subscription not found.',
        })
      }

      await Subscription.delete({ id: subscription.id })

      return {
        success: true,
        deletedId: subscription.id,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not delete subscription')
    }
  })
