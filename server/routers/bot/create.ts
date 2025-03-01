import 'env/loader'

import { Router } from '@/controllers/router.js'
import { Bot } from '@/database/entity/Bot.js'
import { z } from 'zod'

export default new Router({
  name: 'CreateBot',
  description: 'Create a new bot',
  authenticate: true,
  schema: z.object({
    name: z.string().max(256),
    enabled: z.boolean().default(true)
  }),
  async post({ reply, request, schema }) {
    try {

      const bot = await Bot.create({
        name: schema.name,
        user: request.user,
        enabled: schema.enabled,
        plugins: [],
        subscriptions: []
      }).save()
      
      return reply.status(200).send({
        message: 'Bot created successfully!',
        data: {
          ...bot,
          user: undefined
        }
      })
    } catch (err) {
      if (err instanceof Error) {
        return reply.status(500).send({
          message: `Internal Server Error: ${err.message}`
        })
      }
    
      return reply.status(500).send({
        message: `Internal Server Error: ${JSON.stringify(err)}`
      })
    }
  }
})