import { ServerEvent } from 'socket'
import { Role } from '@/database/enums.js'
import { nodeBridge } from '@/services/NodeBridge.js'
import type { SocketCtx, SocketData } from '@/socket/types.js'

export const dashboardNodeStatusSubscribe = new ServerEvent<'dashboard:node:status:subscribe', SocketCtx>({
  name: 'dashboard:node:status:subscribe',
  onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const user = socketData.user!
    if (user.role !== Role.Administrator) {
      fastify.log.warn({ userId: user.id, nodeId: data.nodeId }, '[socket] node status subscribe denied')
      return
    }

    const room = `dashboard:node:${data.nodeId}:status`
    void socket.join(room)
    if (!socketData.watchedNodeStatusIds!.includes(data.nodeId)) socketData.watchedNodeStatusIds!.push(data.nodeId)

    socket.emit('node:status', nodeBridge.emitStatus(fastify, data.nodeId))
    fastify.log.info(`[socket] user ${user.id} subscribed to ${room}`)
  },
})

export const dashboardNodeStatusUnsubscribe = new ServerEvent<'dashboard:node:status:unsubscribe', SocketCtx>({
  name: 'dashboard:node:status:unsubscribe',
  onRun({ data, socket, ctx: { fastify } }) {
    const socketData = socket.data as SocketData
    const user = socketData.user!
    void socket.leave(`dashboard:node:${data.nodeId}:status`)
    socketData.watchedNodeStatusIds = socketData.watchedNodeStatusIds?.filter((id) => id !== data.nodeId) ?? []
    fastify.log.info(`[socket] user ${user.id} left dashboard:node:${data.nodeId}:status`)
  },
})
