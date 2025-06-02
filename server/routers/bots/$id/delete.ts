import { Router } from '@/controllers/router.js'
import { Bot } from '@/database/entity/Bot.js'
import { Role } from '@/database/enums'
import { z } from 'zod'

export default new Router({
  name: 'DeleteBot',
  path: '/bots/:id',
  description: 'Delete Bot',
  authenticate: true,
  methods: {
    async delete({ reply, schema, request }) {
      const params = request.params as { id: string }
      const id = parseInt(params.id)
      const isAdmin = request.user.role === Role.Administrator
      
      const bot = await Bot.findOne({
        where: {
          id,
          user: isAdmin ? undefined : { id: request.user.id },
        },
        relations: {
          subscriptions: true
        }
      })

      if (!bot) return reply.status(404).send({
        message: 'Bot not found, maybe it\'s not yours!'
      })

      await Promise.all(bot.subscriptions.map((subscription) => subscription.remove()))
      const removed = await bot.remove()
    
      return reply.status(200).send({
        message: 'Bot with your signature successfully removed!',
        data: removed
      })
    }
  }
})