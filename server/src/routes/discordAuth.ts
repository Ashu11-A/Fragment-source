import type { FastifyPluginAsync } from 'fastify'
import { assertRedirectUriAllowed, buildDiscordAuthorizeUrl, signDiscordOAuthState } from '../services/discordOAuth.js'

const discordAuthRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { redirect_uri?: string } }>('/auth/discord/start', async (request, reply) => {
    const redirect_uri = request.query.redirect_uri?.trim()
    if (!redirect_uri) {
      return reply.status(400).send({ error: 'redirect_uri is required' })
    }

    try {
      assertRedirectUriAllowed(redirect_uri)
    } catch {
      return reply.status(400).send({ error: 'redirect_uri is not allowed' })
    }

    if (!process.env.DISCORD_CLIENT_ID) {
      return reply.status(503).send({ error: 'Discord OAuth is not configured' })
    }

    let state: string
    try {
      state = signDiscordOAuthState(redirect_uri)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('OAUTH_STATE_SECRET')) {
        return reply.status(503).send({ error: 'Discord OAuth state signing is not configured' })
      }
      throw err
    }

    const location = buildDiscordAuthorizeUrl(redirect_uri, state)
    return reply.redirect(location)
  })
}

export default discordAuthRoutes
