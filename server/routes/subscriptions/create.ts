import { Subscription } from '@/database/entity/Subscription.js'
import { protectedProcedure } from '@/trpc.js'
import { TRPCError } from '@trpc/server'
import { addDays } from 'date-fns'
import { z } from 'zod'
import { toTrpcError } from '../_shared/errors.js'

const createSubscriptionSchema = z.object({
  startAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
})

export const createSubscriptionProcedure = protectedProcedure
  .input(createSubscriptionSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const startAt = input.startAt ?? new Date()
      const expiresAt = input.expiresAt ?? addDays(startAt, 30)

      if (expiresAt <= startAt)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'expiresAt must be greater than startAt.',
        })

      const subscription = await Subscription.create({
        active: true,
        user: { id: ctx.user.id },
        startAt,
        expiresAt,
      }).save()


      return {
        ...subscription,
        user: ctx.user,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not create subscription')
    }
  })
