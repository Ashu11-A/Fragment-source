import jwt from 'jsonwebtoken'
import { IsNull, Not } from 'typeorm'
import { Session } from '@/database/entity/Session.js'
import { Bot } from '@/database/entity/Bot.js'
import type { User } from '@/database/entity/User.js'
import {
  jwtSignExpiresInSeconds,
  resolveAccessExpireMs,
  resolveRefreshExpireMs,
} from '@/security/jwtExpiryConfig.js'
import { billing } from '@/services/Billing.js'

/** Global hard limit for total user sessions (browser + bot). */
const MAX_TOTAL_SESSIONS = 5

/**
 * Builds a human-readable device name for a bot container session.
 * Format: `bot:<id> — <name>`
 */
function buildDeviceName(botId: number, botName: string): string {
  return `bot:${botId} — ${botName}`
}

/**
 * Issues JWT access + refresh tokens for a bot container without an HTTP context.
 * Saves a Session so the token is accepted by the server's auth middleware.
 *
 * Enforces two limits:
 * 1. The user's plan `maxBots` — restricts how many distinct bots can have
 *    active container sessions simultaneously.
 * 2. Global `MAX_TOTAL_SESSIONS` (5) — prunes the oldest sessions when exceeded.
 */
export async function issueContainerSession(
  user: User,
  botId: number,
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenSecret = process.env.JWT_TOKEN
  const refreshSecret = process.env.REFRESH_TOKEN
  if (!tokenSecret || !refreshSecret) {
    throw new Error('JWT_TOKEN or REFRESH_TOKEN is undefined')
  }

  // --- Plan-based bot connection limit ---
  const { plan } = await billing.effectivePlan(user.id)

  if (!billing.isUnlimited(plan.maxBots)) {
    // Count distinct bots with active sessions for this user
    const activeBotSessions = await Session.createQueryBuilder('session')
      .innerJoin('session.bot', 'bot')
      .select('DISTINCT bot.id', 'botId')
      .where('session.userId = :userId', { userId: user.id })
      .andWhere('session.valid = :valid', { valid: true })
      .andWhere('bot.id != :botId', { botId })
      .getRawMany<{ botId: number }>()

    // +1 because we're about to add this bot
    if (activeBotSessions.length + 1 > plan.maxBots) {
      throw new Error(
        `Plan "${plan.name}" allows a maximum of ${plan.maxBots} simultaneous bot connection(s). `
        + `You currently have ${activeBotSessions.length} other bot(s) connected.`,
      )
    }
  }

  // --- Resolve bot name ---
  const bot = await Bot.findOne({ where: { id: botId }, select: ['id', 'name'] })
  const botName = bot?.name ?? 'Unknown'
  const deviceName = buildDeviceName(botId, botName)

  // --- Issue tokens ---
  const expiresTokenMs = resolveAccessExpireMs()
  const expiresRefreshMs = resolveRefreshExpireMs()
  const expirationRefreshDate = new Date(Date.now() + expiresRefreshMs)

  const payload = { id: user.id, username: user.username, email: user.email }

  const accessToken = jwt.sign(payload, tokenSecret, {
    expiresIn: jwtSignExpiresInSeconds(expiresTokenMs),
    algorithm: 'HS512',
  })

  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: jwtSignExpiresInSeconds(expiresRefreshMs),
    algorithm: 'HS512',
  })

  // --- Prune old bot sessions beyond the global 5-session cap ---
  const allSessions = await Session.find({
    where: { user: { id: user.id }, valid: true },
    relations: { bot: true },
    order: { createdAt: 'ASC' },
  })

  if (allSessions.length >= MAX_TOTAL_SESSIONS) {
    const toRemove = allSessions.slice(0, allSessions.length - MAX_TOTAL_SESSIONS + 1)
    for (const session of toRemove) {
      await session.remove()
    }
  }

  // --- Create the session ---
  await Session.create({
    accessToken,
    refreshToken,
    user,
    expiresAt: expirationRefreshDate,
    deviceName,
    bot: { id: botId },
  }).save()

  return { accessToken, refreshToken }
}
