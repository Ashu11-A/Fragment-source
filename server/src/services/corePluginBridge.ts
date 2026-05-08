import type { User } from '@/database/entity/User.js'
import type { CorePluginRequest, CorePluginResultPayload } from '@/types/corePlugin.js'
import { TRPCError } from '@trpc/server'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

const pending = new Map<
  string,
  {
    expectedBotId: number
    resolve: (p: CorePluginResultPayload) => void
    reject: (e: Error) => void
    timer: ReturnType<typeof setTimeout>
  }
>()

const DEFAULT_TIMEOUT_MS = 30_000

export function resolveCorePluginResult(identifiedBotId: number | undefined, payload: CorePluginResultPayload) {
  if (identifiedBotId === undefined) {
    return
  }
  const { requestId } = payload
  const entry = pending.get(requestId)
  if (entry == null) {
    return
  }
  if (entry.expectedBotId !== identifiedBotId) {
    return
  }
  clearTimeout(entry.timer)
  pending.delete(requestId)
  entry.resolve(payload)
}

import type { CorePluginActionInput } from '@/types/corePlugin.js'
import { activity } from './Activity.js'

export async function callCorePlugin(
  log: FastifyInstance['log'],
  user: User,
  botId: number,
  action: CorePluginActionInput,
  options?: { timeoutMs?: number }
): Promise<CorePluginResultPayload> {
  if (!await activity.assertOwnership(user, botId)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Bot not found or not yours.',
    })
  }

  const { Fastify } = await import('../infra/fastify.js')
  const raw = Fastify.server?.io
  const room = raw?.sockets?.adapter?.rooms?.get(`bot:${botId}`)
  if (room == null || room.size === 0) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Core is offline (no process linked to this bot).',
    })
  }

  const { getCoreIo } = await import('../socket/namespaces/index.js')
  const io = getCoreIo()

  const requestId = randomUUID()
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const request: CorePluginRequest = (() => {
    switch (action.action) {
    case 'list':
      return { requestId, action: 'list' }
    case 'reload':
      return { requestId, action: 'reload', filePath: action.filePath }
    case 'unload':
      return { requestId, action: 'unload', pluginName: action.pluginName }
    case 'load':
      return { requestId, action: 'load', filePath: action.filePath }
    }
  })()

  return new Promise<CorePluginResultPayload>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending.has(requestId)) {
        pending.delete(requestId)
        log.warn({ botId, requestId }, '[core:plugin:bridge] timeout')
        reject(new TRPCError({ code: 'TIMEOUT', message: 'Core did not respond in time.' }))
      }
    }, timeoutMs)

    pending.set(requestId, {
      expectedBotId: botId,
      resolve: (p) => {
        resolve(p)
      },
      reject: (e) => {
        reject(e)
      },
      timer,
    })

    io.to(`bot:${botId}`).emit('core:plugin:request', request)
  })
}
