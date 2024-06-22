import { i18 } from '@/index.js'
import express, { type Application } from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { Event } from './events.js'

export class SocketController {
  protected readonly app: Application
  public server
  static io: Server

  constructor() {
    this.app = express()
    this.server = createServer(this.app)
    SocketController.io = new Server(this.server, {
      path: '/socket.io',
    })
  }

  listen(port: string) {
    this.server.listen(port, () => {
      console.log(i18('websocket.initialized', { port }))
    })
  }

  ready() {
    SocketController.io.on('connection', async (client) => new Event({ client }).controller())
  }
}
