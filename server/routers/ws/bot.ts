import { Fastify } from '@/controllers/fastify.js'
import { Bot } from '@/database/entity/Bot.js'
import { bots, storage } from '@/index.js'
import { BearerStrategy } from '@/strategies/BearerStrategy.js'
import { BotStatus } from '@/types/websocket.js'

Fastify.server.register(async (fastify) => {
  fastify.get('/ws/:uuid', { websocket: true }, async (socket, request) => {
    // Validate authentication using BearerStrategy
    const strategy = await new BearerStrategy().validation(request)
    if (!strategy.authenticated) {
      console.log('Unauthorized websocket connection!')
      socket.close(403, 'Access denied!')
      return
    }

    const { uuid } = request.params as { uuid?: string }
    if (!uuid) {
      socket.close(400, 'uuid was not specified!')
      return
    }

    bots.set(uuid, { socket, status: BotStatus.Connecting })
    console.log(`Bot ${uuid} is connecting...`)

    try {
      const bot = await Bot.findOne({
        where: { uuid },
        relations: { plugins: true, subscriptions: true, user: true }
      })

      if (!bot) {
        console.log(`Bot ${uuid} not found...`)
        socket.send(
          JSON.stringify({
            status: 404,
            message: 'Bot not found'
          })
        )
        socket.close()
        return
      }

      if (!bot.enabled) {
        console.log(`Bot ${uuid} is disabled...`)
        socket.send(
          JSON.stringify({
            status: 403,
            message: 'Bot disabled'
          })
        )
        socket.close()
        return
      }

      bots.set(uuid, { socket, status: BotStatus.Connected })
      console.log(`Bot ${uuid} is connected!`)
      socket.send(
        JSON.stringify({
          status: 200,
          message: 'Bot connected',
          bot
        })
      )

      socket.on('message', async (messageEvent) => {
        try {
          const data = JSON.parse(messageEvent.toString())

          switch (data.type) {
          case 'log': {
            await storage.append(`${uuid}.log`, data.message, { folder: 'logs' })
            break
          }
          default: {
            console.log(`Message from Bot ${uuid}:`, data)
            break
          }
          }
        } catch (error) {
          console.error('Error processing message:', error)
        }
      })

      socket.on('close', () => {
        bots.set(uuid, { socket, status: BotStatus.Disconnected })
        console.log(`Bot ${uuid} disconnected.`)
      })
    } catch (error) {
      console.error('WebSocket connection error:', error)
      socket.close()
    }
  })
})
