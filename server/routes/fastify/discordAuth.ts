import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { discord, buildDiscordAuthorizeUrl } from '@/services/Discord.js'

export default async function discordAuthRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  fastify.get('/auth/discord/start', async (request, reply) => {
    const query = request.query as { redirect_uri?: string }
    const redirectUri = query.redirect_uri?.trim()

    if (!redirectUri) {
      return reply.status(400).send({ message: 'Query parameter redirect_uri is required.' })
    }

    try {
      discord.assertRedirectUri(redirectUri)
      const state = discord.signState(redirectUri)
      const authorizeUrl = buildDiscordAuthorizeUrl(redirectUri, state)
      return reply.redirect(authorizeUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start Discord OAuth flow.'
      return reply.status(400).send({ message })
    }
  })
}
