import { ServerEvent } from 'socket'
import type { SocketCtx } from '@/socket/types.js'

export const pluginHealth = new ServerEvent<'plugin:health', SocketCtx>({
  name: 'plugin:health',
  onRun({ data, ctx: { fastify } }) {
    fastify.log.info(
      `[socket] Plugin health update: ${data.name} is ${data.healthy ? 'healthy' : 'unhealthy'}`
    )
  },
})
