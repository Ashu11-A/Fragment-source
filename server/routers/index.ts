import { Router } from '@/controllers/router.js'
import { z } from 'zod'

const router = new Router({
  name: 'Home',
  description: 'Home API',
  schema: z.object({
    name: z.string()
  }),
  authenticate: true,
  post(_request, reply, schema) {
    return reply.code(200).send({ message: 'Hello', data: schema.name })
  }
})

type HandlerReturnType = ReturnType<typeof router.methods.post>
/**
 * Retorna isso por causa do status 200
 * type Response = {
 *  message: string;
 *   data?: unknown;
 * }
 */
type Response = NonNullable<Parameters<HandlerReturnType['send']>[0]>

export default router