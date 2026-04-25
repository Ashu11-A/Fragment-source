import { corePluginRequest } from './events/corePluginRequest.js'

let installed = false

/**
 * Chamar depois de `export const plugin` em `app.ts` existir; requer `connectSocket` já executado.
 */
export async function installCorePluginRequestHandlers() {
  if (installed) return
  const { socket } = await import('./socket.js')
  if (socket == null) {
    console.warn('[core:plugin] socket not initialised — plugin request handlers not installed')
    return
  }
  installed = true
  corePluginRequest.register(socket)
}
