import express, { type Application } from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { i18 } from '../index.js'

export class WebSocket {
  protected readonly app: Application
  public port: number = 3000
  public server
  static io: Server

  constructor() {
    this.app = express()
    this.server = createServer(this.app)
    WebSocket.io = new Server(this.server, {
      path: '/socket.io',
    })
  }

  listen(port: number) {
    this.server.listen(port, () => {
      console.log(i18('websocket.initialized', { port }))
    }).on('error', (err) => {
      console.log(err)
  
      this.port++
      return this.listen(this.port)
    })
  }
}
