import { Router } from '@/controllers/router.js'
import { Bot } from '@/database/entity/Bot.js'

export default new Router({
  name: 'GetDetails',
  path: '/bots/:id',
  description: 'Get Details about one bot',
  methods: {
    async get({ reply, request }) {
      const params = request.params as { id: string }
      const id = parseInt(params.id)
    
      if (!id) return reply.status(422).send({
        message: 'Id not specified!'
      })
  
      const bot = await Bot.findOneBy({ id })
      if (!bot) return reply.status(404).send({
        message: 'Bot not found!'
      })
  
      return reply.status(200).send({
        message: 'Request completed successfully!',
        data: bot
      })
    }
  }
})