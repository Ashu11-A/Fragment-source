import { Router } from '@/controllers/router.js'
import { Bot } from '@/database/entity/Bot.js'
import { Role } from '@/database/entity/User.js'
import { z } from 'zod'

export default new Router({
  name: 'EditBot',
  description: 'Edit Bot',
  authenticate: true,
  schema: z.object({
    id: z.number(),
    name: z.string().max(256).optional(),
    enabled: z.boolean().optional()
  }),
  async put({ reply, request, schema }) {
    try {
      const isAdmin = request.user.role === Role.Administrator
      const bot = await Bot.findOneBy({
        id: schema.id,
        user: isAdmin ? undefined : { id: request.user.id },
      })
      
      if (!bot) return reply.status(404).send({
        message: 'Bot not found, maybe it\'s not yours!'
      })
    
      if (schema.name) bot.name = schema.name
      if (schema.enabled) bot.enabled = schema.enabled
    
      await bot.save()
    
      return reply.status(200).send({
        message: 'bot changed successfully!',
        data: bot
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