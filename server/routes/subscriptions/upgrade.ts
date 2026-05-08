import { TRPCError } from '@trpc/server'
import { addDays } from 'date-fns'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Plan } from '@/database/entity/Plan.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { toTrpcError } from '../_shared/errors.js'

const TIER_ORDER: Record<string, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

const upgradeSchema = z.object({
  planKey: z.string().min(1),
})

export const upgradeSubscriptionProcedure = protectedProcedure
  .input(upgradeSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const plan = await Plan.findOne({ where: { key: input.planKey } })
      if (!plan) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Plan not found.',
      })

      const currentSubscription = await Subscription.findOne({
        where: { user: { id: ctx.user.id }, active: true },
        relations: { plan: true },
        order: { createdAt: 'DESC' },
      })

      const currentTier = currentSubscription?.plan?.tier ?? 'free'
      const targetTier = plan.tier

      if (TIER_ORDER[targetTier] < TIER_ORDER[currentTier]) throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `You cannot downgrade from ${currentTier} to ${targetTier}. Please cancel your current subscription instead.`,
      })

      if (currentSubscription) {
        currentSubscription.active = false
        await currentSubscription.save()
      }

      const now = new Date()
      const expiresAt = addDays(now, 30)

      const subscription = await Subscription.create({
        user: { id: ctx.user.id },
        plan,
        active: true,
        startAt: now,
        expiresAt,
      }).save()

      return {
        ...subscription,
        user: ctx.user,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not upgrade subscription')
    }
  })
