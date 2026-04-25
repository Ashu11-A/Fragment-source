import { ServerEvent } from 'socket'
import { resolveCorePluginResult } from '@/services/corePluginBridge.js'
import type { SocketData } from '../types.js'

export const corePluginResult = new ServerEvent({
  name: 'core:plugin:result',
  onRun({ data, socket }) {
    const socketData = socket.data as SocketData
    resolveCorePluginResult(socketData.identifiedBotId, data)
  },
})
