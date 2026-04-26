import { type FastifyRequest } from 'fastify'
import type { IncomingMessage } from 'http'
import { Strategy } from './Base.js'
import { validateAccessToken } from '../validateToken.js'
import type { User } from '@/database/entity/User.js'

export class BearerStrategy extends Strategy<User> {
  constructor() {
    super('bearer')
  }

  async validation(request: FastifyRequest | IncomingMessage) {
    const authHeader = request.headers['authorization']
    const token =
      typeof authHeader === 'string'
        ? authHeader.replace(/^Bearer\s+/i, '').trim()
        : ''

    request.headers['authorization'] = token

    if (token.length === 0) return this.fail('Token de autenticação necessário', 401)

    const user = await validateAccessToken(token)
    if (!user) return this.fail('Token inválido ou revogado', 401)

    return this.success(user)
  }
}
