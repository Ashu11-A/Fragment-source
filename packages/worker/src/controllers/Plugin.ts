import type { Socket } from 'socket.io'
import { i18 } from '..'
import { Manager, WebSocket } from '../app'
import type { DiscordMetadata } from '../types/discord'
import type { WebSocketMetadata } from '../types/websocket'
import { Watcher } from './Watcher'

export class Plugin {
  static readonly plugins = new Map<string, { manager: Manager, discord: DiscordMetadata, websocket: WebSocketMetadata }>()

  constructor (public port: number) {}

  /**
   * Inicia o Watcher para monitorar mudanças nos plugins.
   */
  public watcher () {
    const onChange = async (filePath: string) => { 
      console.log('🔄 Plugin change detected:', filePath)
      console.log(i18('plugins.new'))

      this.register(filePath)
    }

    console.log('👀 Starting plugin watcher...')
    new Watcher({ onChange })
  }

  /**
   * Registra e inicializa um novo plugin.
   * @param filePath Caminho do arquivo do plugin.
   */
  async register(filePath: string) {
    const plugin = Plugin.plugins.get(filePath)
    if (plugin) {
      console.log(`🔁 Plugin has already been registered, unplugged and restarted: ${filePath}`)
      plugin.manager.worker.terminate()
    }

    console.log(`✨ Enabling plugin: ${filePath}`)
    const manager = new Manager({ fileURL: filePath, port: this.port })

    try {
      await manager.start()
      const client = await new Promise<Socket>((resolve, rejects) => {
        setTimeout(() => rejects(new Error('⌛ Time limit for registering the socket has expired')), 10000)

        WebSocket.io.on('connection', (client) => {
          client.send('whoIs')
          client.on('I\'m', (pluginPath) => {
            if (filePath === pluginPath) resolve(client)
          })
        })
      })
      
      Plugin.plugins.set(filePath, {
        manager,
        websocket: { id: client.id },
        discord: {
          commands: [],
          events: [],
          components: [],
          configs: [],
          crons: [],
          entries: []
        }
      })
      console.log(`✅ Plugin successfully enabled: ${filePath}`)
      client.send('registered')
    } catch (error) {
      console.error(`❌ Error enabling plugin: ${filePath}`, error)
    }
  }
}