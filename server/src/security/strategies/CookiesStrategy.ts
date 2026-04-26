import { type FastifyRequest } from 'fastify'
import { Strategy } from './Base.js'
import { validateAccessToken } from '../validateToken.js'
import type { User } from '@/database/entity/User.js'

export class CookiesStrategy extends Strategy<User> {
  constructor() {
    super('cookies')
  }

  async validation(request: FastifyRequest) {
    const cookie = request.cookies['Bearer']
    if (!cookie) return this.fail('Token de autenticação necessário', 401)

    const user = await validateAccessToken(cookie)
    if (!user) return this.fail('Token inválido ou revogado', 401)

    return this.success(user)
  }
}
