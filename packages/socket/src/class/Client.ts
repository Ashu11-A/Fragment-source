import { io, Socket } from 'socket.io-client'
import { Package } from 'utils'
import type { SocketOptions } from '../type/socket'

export class SocketClient {
  public readonly port: number
  public readonly path: string

  public client: Socket
  static client: Socket

  constructor({ path, port }: SocketOptions) {
    this.path = path
    this.port = port
    this.client = this.create()
    this.registerEventHandlers()
    SocketClient.client = this.client
  }

  /**
   * Cria uma instância do cliente Socket.IO e conecta ao servidor.
   * @returns Uma instância de Socket.
   */
  private create (): Socket {
    console.log(`📡 Aguardando conexão na porta ${this.port}...`)
    return io(`ws://localhost:${this.port}/`)
  }

  /**
   * Registra os manipuladores de eventos para o socket.
   */
  private registerEventHandlers(): void {
    this.client.on('connect', async () => {
      process.stdout.write('📡 Connected to socket')
    })

    this.client.on('whoIs', () => {
      const packageName = Package.getData()['name']
      this.client.emit('I\'m', packageName)
    })
    this.client.on('kill', () => {
      process.stdout.write('📡 Recebido sinal de desligamento. Encerrando o processo...')
      process.kill(process.pid)
    })
  }

  /**
   * Encerra a conexão do cliente com o servidor.
   */
  destroy () {
    this.client.disconnect()
  }
}