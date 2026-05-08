import { ServerEvent } from 'socket'
import type { SocketCtx } from '@/socket/types.js'

export const ping = new ServerEvent<'ping', SocketCtx>({
  name: 'ping',
  onRun({ socket, ctx: { fastify } }) {
    socket.emit('server:status', {
      status: 'online',
      connectedClients: fastify.io.engine.clientsCount,
      uptime: process.uptime(),
    })
  },
})

export const serverStatusRequest = new ServerEvent<'server:status:request', SocketCtx>({
  name: 'server:status:request',
  onRun({ socket, ctx: { fastify } }) {
    socket.emit('server:status', {
      status: 'online',
      connectedClients: fastify.io.engine.clientsCount,
      uptime: process.uptime(),
    })
  },
})
