import { Router } from '@/controllers/router.js'
import { z } from 'zod'

export default new Router({
  name: 'Home',
  description: 'Home API',
  schema: {
    post: z.object({
      world: z.string()
    })
  },
  methods: {
    post({ reply, schema }) {
      return reply.status(200).send({ message: 'Hello', data: schema.world })
    }
  },
})