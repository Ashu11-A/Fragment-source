import express, { type Application } from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import ws from 'ws'
import { Event } from './events.js'
import eiows from 'eiows'
import { i18 } from '@/lang.js'

export class SocketController {
  protected readonly app: Application
  public server
  static io: Server

  constructor() {
    this.app = express()
    this.server = createServer(this.app)
    SocketController.io = new Server(this.server, {
      path: '/socket.io',
      wsEngine: process.platform !== 'win32' ? eiows.Server : ws.Server
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
