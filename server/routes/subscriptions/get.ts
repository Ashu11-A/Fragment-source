import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { Role } from '@/database/enums.js'
import { toTrpcError } from '../_shared/errors.js'

const getSubscriptionSchema = z.object({
  id: z.number().int().positive(),
})

export const getSubscriptionProcedure = protectedProcedure
  .input(getSubscriptionSchema)
  .query(async ({ input, ctx }) => {
    try {
      const subscription = await Subscription.findOne({
        where: { id: input.id },
        relations: {
          user: true,
          plan: true,
        },
      })

      if (!subscription) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found.',
      })

      if (ctx.user.role !== Role.Administrator && subscription.user.id !== ctx.user.id)
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Subscription is not accessible.',
        })

      return subscription
    } catch (error) {
      throw toTrpcError(error, 'Could not fetch subscription')
    }
  })
