import { Router } from '@/controllers/router.js'
import dataSource from '@/database/dataSource.js'
import { Bot } from '@/database/entity/Bot.js'
import { Role } from '@/database/entity/User.js'
import { z } from 'zod'

export default new Router({
  name: 'DeleteBot',
  description: 'Delete Bot',
  authenticate: true,
  schema: {
    delete: z.object({
      id: z.number()
    })
  },
  methods: {
    async delete({ reply, schema, request }) {
      try {
        const isAdmin = request.user.role === Role.Administrator
        const bot = await Bot.findOne({
          where: {
            id: schema.id,
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
  
        await dataSource.query(`DROP DATABASE IF EXISTS \`${bot.database.database}\``)
        await dataSource.query(`DROP USER IF EXISTS '${bot.database.username}'@'%'`)
        await bot.remove()
        return reply.status(200).send({
          message: 'Bot with your signature successfully removed!'
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