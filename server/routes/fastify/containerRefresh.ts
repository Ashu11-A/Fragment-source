import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import jwt from 'jsonwebtoken'
import { Session } from '@/database/entity/Session.js'
import { User } from '@/database/entity/User.js'
import { issueContainerSession } from '@/security/containerSession.js'
import { resolveAccessExpireMs } from '@/security/jwtExpiryConfig.js'
import type { JWTData } from '@/types/jwt.js'

/**
 * POST /api/container/refresh
 *
 * Allows a bot container daemon to exchange a valid refresh token for
 * a fresh access + refresh token pair.  This is used when the daemon's
 * access token has been revoked (e.g. the user clicked "Log Out All")
 * but the refresh token's JWT signature is still valid.
 *
 * Body: { refreshToken: string, botId: number }
 * Returns: { accessToken: string, refreshToken: string }
 */
export default async function containerRefreshRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  fastify.post('/api/container/refresh', async (request, reply) => {
    const body = request.body as { refreshToken?: unknown; botId?: unknown } | undefined

    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : ''
    const botId = typeof body?.botId === 'number' ? body.botId : Number(body?.botId)

    if (refreshToken.length === 0) {
      return reply.status(400).send({ message: 'refreshToken is required.' })
    }

    if (!Number.isInteger(botId) || botId <= 0) {
      return reply.status(400).send({ message: 'botId must be a positive integer.' })
    }

    const refreshSecret = process.env.REFRESH_TOKEN
    if (!refreshSecret) {
      return reply.status(500).send({ message: 'Server misconfiguration: refresh secret missing.' })
    }

    // 1. Verify the JWT signature is still cryptographically valid (not expired).
    let decoded: JWTData
    try {
      decoded = jwt.verify(refreshToken, refreshSecret, { algorithms: ['HS512'] }) as JWTData
    } catch {
      return reply.status(401).send({ message: 'Refresh token is expired or malformed.' })
    }

    if (!decoded?.id) {
      return reply.status(401).send({ message: 'Refresh token payload is invalid.' })
    }

    // 2. Find the session that owns this refresh token (may be invalidated).
    const session = await Session.findOne({
      where: { refreshToken },
      relations: { user: true },
    })

    if (!session) {
      return reply.status(401).send({ message: 'No session found for this refresh token.' })
    }

    // 3. Look up the user from the JWT (more trustworthy than the session relation).
    const user = await User.findOne({ where: { id: decoded.id } })
    if (!user) {
      return reply.status(401).send({ message: 'User no longer exists.' })
    }

    // 4. Issue new session first so the old one is only removed on success.
    let tokens: { accessToken: string; refreshToken: string }
    try {
      tokens = await issueContainerSession(user, botId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not issue container session.'
      return reply.status(403).send({ message })
    }

    // 5. Remove the old session now that the new one is safely persisted.
    await session.remove()

    return reply.send({
      ...tokens,
      accessExpiresAt: Date.now() + resolveAccessExpireMs(),
    })
  })
}
