import { LessThan } from 'typeorm'
import { Subscription } from '@/database/entity/Subscription.js'
import { billing } from '@/services/Billing.js'
import { Cron } from '@/infra/cron.js'

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour
const LOCK_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function checkExpiredSubscriptions(): Promise<void> {
  const now = new Date()

  const expiredSubscriptions = await Subscription.find({
    where: {
      active: true,
      expiresAt: LessThan(now),
    },
    relations: { user: true },
  })

  for (const subscription of expiredSubscriptions) {
    subscription.active = false
    await subscription.save()
    await billing.disableAll(subscription.user.id)
    console.log(`[subscription] expired subscription ${subscription.id} for user ${subscription.user.id} — bots disabled`)
  }

  if (expiredSubscriptions.length > 0) {
    console.log(`[subscription] processed ${expiredSubscriptions.length} expired subscriptions`)
  }
}

export const subscriptionExpiryCron = new Cron({
  name: 'subscription-expiry',
  intervalMs: CHECK_INTERVAL_MS,
  handler: checkExpiredSubscriptions,
  runOnStart: true,
  distributedLock: {
    enabled: true,
    lockKey: 'subscription:expiry:checker',
    ttlMs: LOCK_TTL_MS,
  },
})
