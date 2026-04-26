import { User } from '@/database/entity/User.js'
import { Bot } from '@/database/entity/Bot.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { adminProcedure } from '@/trpc.js'

export const summary = adminProcedure
  .query(async () => {
    const [totalUsers, totalBots, totalPlugins, activeSubscriptions] = await Promise.all([
      User.count(),
      Bot.count(),
      Plugin.count(),
      Subscription.count({ where: { active: true } }),
    ])

    return {
      message: 'Stats retrieved successfully',
      data: {
        totalUsers,
        totalBots,
        totalPlugins,
        activeSubscriptions,
      },
    }
  })
