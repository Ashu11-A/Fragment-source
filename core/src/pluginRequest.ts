import { corePluginRequest } from '@/events/core/pluginRequest.js'

let installed = false

export async function registerPluginHandlers() {
  if (installed) return
  const { socket } = await import('./events/socket.js')
  if (socket == null) {
    console.warn('[core:plugin] socket not initialised — plugin request handlers not installed')
    return
  }
  installed = true
  corePluginRequest.register(socket)
}
