import { i18 } from '..'
import { Manager } from '../app'
import type { DiscordMetadata } from '../types/discord'
import { Watcher } from './Watcher'

export class Plugin {
  static readonly all = new Map<string, { manager: Manager, discord: DiscordMetadata, entries: [] }>()

  constructor (public port: number) {}

  /**
   * Inicia o Watcher para monitorar mudanças nos plugins.
   */
  public watcher () {
    const onChange = async (filePath: string) => { 
      console.log(i18('plugins.new'))

      this.register(filePath)
    }

    console.log(i18('watcher.starting'))
    new Watcher({ onChange })
  }

  /**
   * Registra e inicializa um novo plugin.
   * @param filePath Caminho do arquivo do plugin.
   */
  async register(filePath: string) {
    const plugin = Plugin.all.get(filePath)
    if (plugin) {
      console.log(i18('plugins.hasLoaded', { filePath }))
      plugin.manager.worker.terminate()
    }

    console.log(i18('plugins.enabling', { filePath }), '\n')
    const manager = new Manager({ fileURL: filePath, port: this.port })

    try {
      await manager.start()
      
      Plugin.all.set(manager.socket.id, {
        manager,
        discord: {
          commands: [],
          events: [],
          components: [],
          configs: [],
          crons: [],
        },
        entries: []
      })
      console.log(i18('plugins.enabled', { filePath }))
      manager.socket.emit('register')
    } catch (error) {
      console.error(i18('plugins.notEnabled'), '\n', error)
    }
  }
}