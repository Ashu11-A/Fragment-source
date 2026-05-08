import jwt from 'jsonwebtoken'
import { Session } from '@/database/entity/Session.js'
import { User } from '@/database/entity/User.js'

/**
 * Valida um access token: verifica existência no banco, assinatura JWT e consistência do usuário.
 * Retorna o User autenticado ou null em qualquer falha — erros internos são absorvidos
 * para não vazar detalhes ao chamador.
 */
export async function validateAccessToken(token: string): Promise<User | null> {
  try {
    const secret = process.env.JWT_TOKEN
    if (!secret) return null

    const session = await Session.findOneBy({ accessToken: token })
    if (!session?.valid) return null

    const decoded = jwt.verify(token, secret, { algorithms: ['HS512'] })
    if (typeof decoded !== 'object' || decoded === null) return null
    if (!('id' in decoded)) return null

    const { id } = decoded as { id: number }
    const user = await User.findOneBy({ id })
    if (!user) return null

    return user
  } catch {
    return null
  }
}
