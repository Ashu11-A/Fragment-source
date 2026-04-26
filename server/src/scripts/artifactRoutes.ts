import { TRPCError } from '@trpc/server'
import { authenticator } from '@/infra/auth.js'
import { Fastify } from '@/infra/fastify.js'
import { getAssetById } from '@/lib/githubReleases.js'

/**
 * Download autenticado: redireciona para o URL do GitHub (assets públicos).
 * Requer sessão/cookie ou estratégias suportadas pelo authenticator.
 *
 * GET /api/artifacts/download?tag=v0.0.5-canary&assetId=232636783
 */
export function registerArtifactRoutes() {
  Fastify.server.get(
    '/api/artifacts/download',
    {
      preValidation: (req, reply) => authenticator(req, reply, true),
    },
    async (request, reply) => {
      const q = request.query as { tag?: string; assetId?: string }
      const tag = typeof q.tag === 'string' && q.tag.length > 0 ? q.tag : undefined
      const rawId = q.assetId
      if (!tag || rawId === undefined) {
        return reply.status(400).send({ message: 'Missing query: tag and assetId are required.' })
      }
      const assetId = Number.parseInt(String(rawId), 10)
      if (!Number.isFinite(assetId)) {
        return reply.status(400).send({ message: 'Invalid assetId.' })
      }

      try {
        const { downloadUrl, asset } = await getAssetById(tag, assetId)
        return reply
          .header('Cache-Control', 'private, max-age=60')
          .redirect(302, downloadUrl)
      } catch (err: unknown) {
        if (err instanceof TRPCError) {
          const status = err.code === 'NOT_FOUND' ? 404 : 400
          return reply.status(status).send({ message: err.message })
        }
        const msg = err instanceof Error ? err.message : 'Failed to resolve asset.'
        return reply.status(500).send({ message: msg })
      }
    },
  )
}
