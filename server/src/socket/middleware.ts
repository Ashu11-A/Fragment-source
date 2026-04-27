import type { FastifyInstance } from 'fastify'
import { getAccessTokenFromHandshake, authenticateUserFromAccessToken } from '@/lib/socketHandshakeAuth.js'
import type { SocketData } from '@/socket/types.js'

export function setupSocketMiddleware(fastify: FastifyInstance): void {
  fastify.io.use(async (socket, next) => {
    try {
      const token = getAccessTokenFromHandshake(
        socket.handshake.headers,
        socket.handshake.auth as { token?: unknown },
      )
      if (!token) return next(new Error('Authentication error'))

      const user = await authenticateUserFromAccessToken(token)
      if (!user) return next(new Error('Authentication error'))

      ;(socket.data as SocketData).user = user
      return next()
    } catch (err) {
      fastify.log.error({ err }, '[socket] Auth exception in middleware')
      next(new Error('Authentication error'))
    }
  })
}
