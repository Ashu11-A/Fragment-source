import { Router } from '@/controllers/router.js'
import { Bot } from '@/database/entity/Bot.js'
import { Role } from '@/database/entity/User.js'
import { z } from 'zod'

export default new Router({
  name: 'ListBots',
  description: 'List the bots, if you are an administrator you can list everything',
  authenticate: true,
  schema: {
    get: z.object({
      type: z.enum(['your', 'other'])
    }).default({ type: 'your' })
  },
  methods: {
    async get({ reply, request, schema: { type } }) {
      try {
        const isAdmin = request.user.role === Role.Administrator
        const bots = isAdmin && type === 'other'
          ? await Bot.find({
            relations: {
              subscriptions: true,
              plugins: true,
              database: true
            }
          })
          : await Bot.find({
            where: {
              user: { id: request.user.id }
            },
            relations: {
              subscriptions: true,
              plugins: true,
              database: true
            }
          })
        
        return reply.status(200).send({
          message: 'Request completed successfully!',
          data: bots
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
  }
})