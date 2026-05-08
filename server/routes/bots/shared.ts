import { TRPCError } from '@trpc/server'
import { Bot } from '@/database/entity/Bot.js'
import type { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'

export async function findBotForUser(botId: number, user: User, relations: string[] = []): Promise<Bot> {
  const bot = await Bot.findOne({
    where: {
      id: botId,
      ...(user.role === Role.Administrator ? {} : { user: { id: user.id } }),
    },
    relations,
  })

  if (!bot)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Bot not found.',
    })

  return bot
}
