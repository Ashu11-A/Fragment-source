import { User } from '@/database/entity/User.js'
import { Strategy } from '@fastify/passport'
import { FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'

export class CookiesStrategy extends Strategy {
  constructor() {
    super('cookies')
  }

  async authenticate(request: FastifyRequest) {
    try {
      const secret = process.env.JWT_TOKEN
      if (!secret) throw new Error('JWT_TOKEN não definido!')
      
      const cookie = request.cookies['Bearer']
      console.log(cookie)
      if (!cookie) return this.fail('Token ausente', 401)

      const { valid, value: token } = request.unsignCookie(cookie)
      if (!valid || !token) return this.fail('Cookie inválido', 401)

      const userData = jwt.verify(token, secret, { algorithms: ['HS512'] })
      if (typeof userData !== 'object' || !userData) return this.fail('Token inválido', 403)
      if (!('id' in userData) || !('uuid' in userData)) return this.fail('Token incompleto', 401)

      const { id, uuid } = userData
      const user = await User.findOneBy({ id })
      if (!user || user.uuid !== uuid) return this.fail('Usuário não encontrado', 401)
  

      this.success(user)
    } catch (err) {
      if (err instanceof jwt.JsonWebTokenError) {
        console.log('Token JWT inválido ou expirado')
        return this.fail(null, 401)
      } else if (err instanceof jwt.TokenExpiredError) {
        console.log('Token JWT expirado')
        return this.fail(null, 401)
      } else if (err instanceof jwt.NotBeforeError) {
        console.log('Token JWT não é válido ainda')
        return this.fail(null, 401)
      } else {
        console.error('Erro durante a autenticação:', err)
        return this.error(new Error('Erro interno no servidor'))
      }
    }
  }
}
