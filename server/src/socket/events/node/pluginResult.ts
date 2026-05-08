import { ServerEvent } from 'socket'
import { coreBridge } from '@/services/CoreBridge.js'
import type { SocketData } from '@/socket/types.js'

export const corePluginResult = new ServerEvent({
  name: 'core:plugin:result',
  onRun({ data, socket }) {
    const socketData = socket.data as SocketData
    coreBridge.resolve(socketData.identifiedBotId, data)
  },
})
