import { protectedProcedure } from '@/trpc.js'
import { Plan } from '@/database/entity/Plan.js'
import { toTrpcError } from '../_shared/errors.js'

const defaultPlans = [
  {
    key: 'free',
    name: 'Free',
    description: 'For hobbyists and small projects.',
    tier: 'free',
    monthlyPriceUsd: 0,
    memory: 512,
    cpu: 1,
    maxBots: 1,
    maxPlugins: 3,
    supportLevel: 'community',
    highlights: ['1 Bot', '3 Plugins', 'Community Support'],
    active: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'For growing communities.',
    tier: 'pro',
    monthlyPriceUsd: 9.99,
    memory: 2048,
    cpu: 2,
    maxBots: 5,
    maxPlugins: -1,
    supportLevel: 'priority',
    highlights: ['5 Bots', 'Unlimited Plugins', 'Priority Support'],
    active: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'For large-scale operations.',
    tier: 'enterprise',
    monthlyPriceUsd: 29.99,
    memory: 8192,
    cpu: 4,
    maxBots: -1,
    maxPlugins: -1,
    supportLevel: 'dedicated',
    highlights: ['Unlimited Bots', 'Unlimited Plugins', 'Dedicated Support'],
    active: true,
  },
]

export const listPlansProcedure = protectedProcedure
  .query(async () => {
    try {
      let plans = await Plan.find({ where: { active: true }, order: { monthlyPriceUsd: 'ASC' } })

      if (plans.length === 0) {
        await Plan.insert(defaultPlans)
        plans = await Plan.find({ where: { active: true }, order: { monthlyPriceUsd: 'ASC' } })
      }

      return plans
    } catch (error) {
      throw toTrpcError(error, 'Could not list plans')
    }
  })
