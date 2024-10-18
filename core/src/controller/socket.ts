import { i18 } from '@/controller/lang.js'
import express, { type Application } from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { Event } from './events.js'
import { cache } from '@/index.js'

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

  listen(port: number) {
    this.server.listen(port, () => {
      console.log(i18('websocket.initialized', { port }))
    }).on('error', (err) => {
      console.log(err)
      cache.set('port', port + 1)
      return this.listen(port + 1)
    })
  }

  ready() {
    SocketController.io.on('connection', async (client) => new Event({ client }).controller())
  }
}
