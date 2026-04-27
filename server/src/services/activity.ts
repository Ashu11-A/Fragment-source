import type { FastifyBaseLogger } from 'fastify'
import { Bot } from '@/database/entity/Bot.js'
import type { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import type { ActivitySocketPayload, ActivityIngest } from '@/types/activity.js'
import { ActivityLog } from '@/database/entity/ActivityLog'

export type { ActivitySocketPayload, ActivityIngest }

export function normalizeDisplay(
  level: ActivityIngest['level'],
  display?: ActivityIngest['display'],
): 'success' | 'info' | 'error' {
  if (display) return display
  if (level === 'error' || level === 'warn') return 'error'
  return 'info'
}

export function toSocketPayload(row: ActivityLog): ActivitySocketPayload {
  return {
    id: row.id,
    botId: row.botId,
    level: row.level,
    category: row.category,
    message: row.message,
    display: row.display,
    metadata: row.metadata ?? undefined,
    source: row.source ?? undefined,
    correlationId: row.correlationId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function record(fastifyLog: FastifyBaseLogger, input: ActivityIngest): Promise<ActivityLog> {
  const display = normalizeDisplay(input.level, input.display)

  const row = ActivityLog.create({
    botId: input.botId,
    level: input.level,
    category: input.category,
    message: input.message,
    display,
    metadata: input.metadata ?? null,
    source: input.source ?? null,
    correlationId: input.correlationId ?? null,
  })

  await row.save()

  const child = fastifyLog.child({
    mod: 'bot-activity',
    botId: input.botId,
    activityId: row.id,
    level: input.level,
    category: input.category,
    display,
  })

  switch (input.level) {
    case 'error':
      child.error({ msg: input.message, metadata: input.metadata ?? undefined })
      break
    case 'warn':
      child.warn({ msg: input.message, metadata: input.metadata ?? undefined })
      break
    case 'trace':
    case 'debug':
      child.debug({ msg: input.message, metadata: input.metadata ?? undefined })
      break
    default:
      child.info({ msg: input.message, metadata: input.metadata ?? undefined })
  }

  return row
}

export async function assertOwnership(user: User, botId: number): Promise<boolean> {
  const isAdmin = user.role === Role.Administrator
  const bot = await Bot.findOne({
    where: {
      id: botId,
      ...(isAdmin ? {} : { user: { id: user.id } }),
    },
  })
  return Boolean(bot)
}

export async function fetchLogs(botId: number, limit: number): Promise<ActivityLog[]> {
  return ActivityLog.find({
    where: { botId },
    order: { createdAt: 'DESC' },
    take: limit,
  })
}
