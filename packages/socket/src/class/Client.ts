import { io, Socket } from 'socket.io-client'
import type { SocketOptions } from '../type/socket'
import { metadata } from 'utils'

export class SocketClient {
  public readonly port: number
  public readonly path: string

  static client: Socket

  constructor({ path, port }: SocketOptions) {
    this.path = path
    this.port = port

    this.connect()
    this.registerEventHandlers()
  }

  /**
   * Cria uma instância do cliente Socket.IO e conecta ao servidor.
   * @returns Uma instância de Socket.
   */
  private connect () {
    console.log(`📡 Aguardando conexão na porta ${this.port}...`)
    SocketClient.client = io(`ws://localhost:${this.port}`)
  }

  /**
   * Registra os manipuladores de eventos para o socket.
   */
  private registerEventHandlers(): void {
    SocketClient.client.on('connect', () => {
      console.log(`📡 Connected to socket: ${metadata()?.name ?? SocketClient.client.id}`)
    })
    
    SocketClient.client.on('disconnect', () => {
      console.log(`📡 Disconnected from socket server: ${metadata()?.name ?? SocketClient.client.id}`)
    })

    SocketClient.client.on('connect_error', (err) => {
      console.error('🔌 SocketClient connection error:', err.message)
    })
  }

  /**
   * Encerra a conexão do cliente com o servidor.
   */
  destroy () {
    SocketClient.client.disconnect()
  }
}