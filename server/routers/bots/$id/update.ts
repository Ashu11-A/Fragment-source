import { Router } from '@/controllers/router.js'
import { Bot } from '@/database/entity/Bot.js'
import { Role } from '@/database/enums'
import { z } from 'zod'

export default new Router({
  name: 'EditBot',
  path: '/bots/:id',
  description: 'Edit Bot',
  authenticate: true,
  schema: {
    put: z.object({
      name: z.string().max(256).optional(),
      enabled: z.boolean().optional()
    })
  },
  methods: {
    async put({ reply, request, schema }) {
      const params = request.params as { id: string }
      const id = parseInt(params.id)

      console.log(schema)
    
      const isAdmin = request.user.role === Role.Administrator
      const bot = await Bot.findOneBy({
        id,
        user: isAdmin ? undefined : { id: request.user.id },
      })
      
      if (!bot) return reply.status(404).send({
        message: 'Bot not found, maybe it\'s not yours!'
      })
    
      if (schema.name) bot.name = schema.name
      if (schema.enabled !== undefined) bot.enabled = schema.enabled
    
      await bot.save()
    
      return reply.status(200).send({
        message: 'bot changed successfully!',
        data: bot
      })
    }
  }
})