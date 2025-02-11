import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { Router } from '@/controllers/router.js'
import { Auth } from '@/database/entity/Auth.js'
import { User } from '@/database/entity/User.js'
import { timer } from '@/utils/timer.js'

/**
 * Retorna as opções para configuração dos cookies
 * @param expirationDate Data de expiração do cookie
 */
const getCookieOptions = (expirationDate: Date) => ({
  path: '/',
  expires: expirationDate,
  httpOnly: true,
  secure: process.env.PRODUCTION === 'true',
  domain: process.env.PRODUCTION === 'true' ? process.env.FRONT_END_URL : undefined,
})

export default new Router({
  name: 'UserLogin',
  description:
    'Handles user authentication by validating credentials and issuing JWT tokens for secure access',
  schema: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  }),
  async post({ reply, schema }) {
    const user = await User.findOne({ where: { email: schema.email } })
    if (!user) return reply.code(403).send({ message: 'Invalid email or password' })

    const valid = user.validatePassword(schema.password)
    if (!valid) return reply.code(403).send({ message: 'Invalid email or password' })

    const expiresTokenInSeconds = timer.number(process.env.JWT_EXPIRE ?? '7d') as number
    const expiresRefreshInSeconds = timer.number(process.env.REFRESH_EXPIRE ?? '7d') as number

    const expirationTokenDate = new Date(Date.now() + expiresTokenInSeconds)
    const expirationRefreshDate = new Date(Date.now() + expiresRefreshInSeconds)

    const data = {
      id: user.id,
      uuid: user.uuid,
      username: user.username,
      email: user.email
    }

    const token = jwt.sign(data, process.env.JWT_TOKEN as string, {
      expiresIn: expiresTokenInSeconds,
      algorithm: 'HS512'
    })

    const refresh = jwt.sign(data, process.env.REFRESH_TOKEN as string, {
      expiresIn: expiresRefreshInSeconds,
      algorithm: 'HS512'
    })

    await Auth.create({
      accessToken: token,
      refreshToken: refresh,
      user,
      expireAt: expirationRefreshDate.toISOString()
    }).save()

    reply.setCookie('Bearer', token, getCookieOptions(expirationTokenDate))
    reply.setCookie('Refresh', refresh, getCookieOptions(expirationRefreshDate))

    return reply.code(200).send({
      message: 'Login successful',
      data: {
        token,
        refresh
      }
    })
  }
})
