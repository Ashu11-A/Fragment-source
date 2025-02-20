import { Server } from 'socket.io'
import { i18 } from '../index.js'

export class WebSocket {
  public port: number
  static io: Server

  constructor(port: number) {
    this.port = port
    WebSocket.io = new Server(port)
  }

  listen(port: number): void {
    try {
      WebSocket.io.listen(port)
      console.log(i18('websocket.initialized', { port }))
    } catch (err) {
      console.log(err)
  
      this.port++
      return this.listen(this.port)
    }
  }
}
