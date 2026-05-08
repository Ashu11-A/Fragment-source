import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Role } from '@/database/enums.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { billing } from '@/services/Billing.js'
import { toTrpcError } from '../_shared/errors.js'

const cancelSubscriptionSchema = z.object({
  id: z.number().int().positive().optional(),
})

export const cancelSubscriptionProcedure = protectedProcedure
  .input(cancelSubscriptionSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      let subscription: Subscription | null

      if (input.id) {
        subscription = await Subscription.findOne({
          where: { id: input.id },
          relations: { user: true },
        })
      } else {
        subscription = await Subscription.findOne({
          where: { user: { id: ctx.user.id }, active: true },
          relations: { user: true },
          order: { createdAt: 'DESC' },
        })
      }

      if (!subscription) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found.',
      })
      if (ctx.user.role !== Role.Administrator && subscription.user.id !== ctx.user.id) throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Subscription is not accessible.',
      })
      if (subscription.canceledAt) throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Subscription is already canceled.',
      })

      subscription.canceledAt = new Date()
      await subscription.save()

      const disabledCount = await billing.disableAll(subscription.user.id)
      if (disabledCount > 0) {
        console.log(`[subscription] canceled subscription ${subscription.id} — disabled ${disabledCount} bot(s) for user ${subscription.user.id}`)
      }

      return subscription
    } catch (error) {
      throw toTrpcError(error, 'Could not cancel subscription')
    }
  })
