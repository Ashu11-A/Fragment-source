import { Router } from '@/controllers/router.js'
import { Bot } from '@/database/entity/Bot.js'

export default new Router({
  name: 'GetDetails',
  path: '/bot/:uuid',
  description: 'Get Details about one bot',
  async get({ reply, request }) {
    const uuid = (request.params as { uuid?: string }).uuid
    if (!uuid) return reply.status(422).send({
      message: 'uuid not specified!'
    })

    const bot = await Bot.findOneBy({ uuid })
    if (!bot) return reply.status(404).send({
      message: 'Bot not found!'
    })

    return reply.status(200).send({
      message: 'Request completed successfully!',
      data: bot
    })
  }
})