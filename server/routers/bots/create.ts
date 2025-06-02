import 'env/loader'

import { Router } from '@/controllers/router.js'
import { Bot } from '@/database/entity/Bot.js'
import { Role } from '@/database/enums'
import { z } from 'zod'

export default new Router({
  name: 'CreateBot',
  path: '/bots',
  description: 'Create a new bot',
  authenticate: Role.Administrator,
  schema: {
    post: z.object({
      name: z.string().max(256),
      enabled: z.boolean().default(true)
    })
  },
  methods: {
    async post({ reply, request, schema }) {
      const bot = Bot.create({
        name: schema.name,
        user: request.user,
        enabled: schema.enabled,
        plugins: [],
        subscriptions: [],
      })
  
      await bot.save()
      
      return reply.status(200).send({
        message: 'Bot created successfully!',
        data: {
          bot,
          user: request.user
        }
      })
    }
  }
})