import type { FastifyBaseLogger } from 'fastify'
import { Bot } from '../database/entity/Bot.js'
import { BotActivityLog } from '../database/entity/BotActivityLog.js'
import type { User } from '../database/entity/User.js'
import { Role } from '../database/enums.js'

export type BotActivitySocketPayload = {
  id: number
  botId: number
  level: string
  category: string
  message: string
  display: 'success' | 'info' | 'error'
  metadata?: Record<string, unknown> | null
  source?: string | null
  correlationId?: string | null
  createdAt: string
}

type IngestInput = {
  botId: number
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error'
  category: string
  message: string
  display?: 'success' | 'info' | 'error'
  metadata?: Record<string, unknown>
  source?: string
  correlationId?: string
}

export function normalizeActivityDisplay(
  level: IngestInput['level'],
  display?: 'success' | 'info' | 'error',
): 'success' | 'info' | 'error' {
  if (display) return display
  if (level === 'error' || level === 'warn') return 'error'
  return 'info'
}

export function toActivitySocketPayload(row: BotActivityLog): BotActivitySocketPayload {
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

/**
 * Persist + structured log (Pino via Fastify). Caller is responsible for Socket.IO fan-out.
 */
export async function recordBotActivity(fastifyLog: FastifyBaseLogger, input: IngestInput): Promise<BotActivityLog> {
  const display = normalizeActivityDisplay(input.level, input.display)

  const row = BotActivityLog.create({
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

export async function assertUserOwnsBot(user: User, botId: number): Promise<boolean> {
  const isAdmin = user.role === Role.Administrator
  const bot = await Bot.findOne({
    where: {
      id: botId,
      ...(isAdmin ? {} : { user: { id: user.id } }),
    },
  })
  return Boolean(bot)
}

export async function fetchBotActivityLogs(botId: number, limit: number): Promise<BotActivityLog[]> {
  return BotActivityLog.find({
    where: { botId },
    order: { createdAt: 'DESC' },
    take: limit,
  })
}
