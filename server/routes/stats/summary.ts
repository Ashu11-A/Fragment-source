import { adminProcedure } from '@/trpc.js'
import { User } from '@/database/entity/User.js'
import { Bot } from '@/database/entity/Bot.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { toTrpcError } from '../_shared/errors.js'

export const summaryStatsProcedure = adminProcedure
  .query(async () => {
    try {
      const [users, bots, plugins, activeSubscriptions] = await Promise.all([
        User.count(),
        Bot.count(),
        Plugin.count(),
        Subscription.count({ where: { active: true } }),
      ])

      return {
        users,
        bots,
        plugins,
        activeSubscriptions,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not load platform summary')
    }
  })
