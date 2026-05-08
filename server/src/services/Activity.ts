import { Bot } from '@/database/entity/Bot.js'
import { Log } from '@/database/entity/Log'
import type { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import type { ActivityIngest, ActivitySocketPayload } from '@/types/activity.js'
import type { FastifyBaseLogger } from 'fastify'

export type { ActivityIngest, ActivitySocketPayload }

type PendingLicenseRequest = {
  botId: number
  licenseText: string
  language: string
  version: string
}

export class Activity {
  private readonly licenses = new Map<number, PendingLicenseRequest>()

  private normalizeDisplay(
    level: ActivityIngest['level'],
    display?: ActivityIngest['display'],
  ): 'success' | 'info' | 'error' {
    if (display) return display
    if (level === 'error' || level === 'warn') return 'error'
    return 'info'
  }

  toPayload(row: Log): ActivitySocketPayload {
    return {
      id: row.id,
      botId: row.bot.id,
      level: row.level,
      category: row.category,
      message: row.message,
      display: row.display,
      metadata: row.metadata ?? undefined,
      source: row.source ?? undefined,
      createdAt: row.createdAt.toISOString(),
    }
  }

  async record(log: FastifyBaseLogger, input: ActivityIngest): Promise<Log> {
    const display = this.normalizeDisplay(input.level, input.display)

    const row = await Log.create({
      bot: { id: input.botId },
      level: input.level,
      category: input.category,
      message: input.message,
      display,
      metadata: input.metadata ?? null,
      source: input.source ?? null,
    }).save()

    const child = log.child({
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

  async assertOwnership(user: User, botId: number): Promise<boolean> {
    const isAdmin = user.role === Role.Administrator
    const bot = await Bot.findOne({
      where: {
        id: botId,
        ...(isAdmin ? {} : { user: { id: user.id } }),
      },
    })
    return Boolean(bot)
  }

  async fetchLogs(botId: number, limit: number): Promise<Log[]> {
    return Log.find({
      where: { bot: { id: botId } },
      relations: { bot: true },
      order: { createdAt: 'DESC' },
      take: limit,
    })
  }

  // --- License sub-domain ---

  storeLicense(req: PendingLicenseRequest): void {
    this.licenses.set(req.botId, req)
  }

  getLicense(botId: number): PendingLicenseRequest | undefined {
    return this.licenses.get(botId)
  }

  getLicensesForBots(botIds: number[]): PendingLicenseRequest[] {
    return botIds
      .map((id) => this.licenses.get(id))
      .filter((r): r is PendingLicenseRequest => r !== undefined)
  }

  clearLicense(botId: number): void {
    this.licenses.delete(botId)
  }
}

export const activity = new Activity()
