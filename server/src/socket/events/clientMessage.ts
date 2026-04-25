import { ServerEvent } from 'socket'
import type { SocketCtx } from '../types.js'

export const clientMessage = new ServerEvent<'client:message', SocketCtx>({
  name: 'client:message',
  onRun({ data, ctx: { fastify } }) {
    fastify.log.info({ channel: data.channel, payload: data.payload }, '[socket] client:message')
  },
})
