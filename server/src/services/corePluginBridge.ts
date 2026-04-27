import { randomUUID } from 'node:crypto'
import type { User } from '@/database/entity/User.js'
import { assertOwnership } from '@/services/activity.js'
import type { FastifyInstance } from 'fastify'
import { TRPCError } from '@trpc/server'

type CorePluginRequest =
  | { requestId: string; action: 'list' }
  | { requestId: string; action: 'reload'; filePath: string }
  | { requestId: string; action: 'unload'; pluginName: string }
  | { requestId: string; action: 'load'; filePath: string }

export type CorePluginResultPayload = {
  requestId: string
  ok: boolean
  action: 'list' | 'reload' | 'unload' | 'load'
  message?: string
  details?: string
  plugins?: Array<{
    pluginName: string
    filePath: string
    version?: string
    description?: string | null
    loaded: boolean
  }>
  pluginName?: string
  filePath?: string
}

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

export type CorePluginActionInput =
  | { action: 'list' }
  | { action: 'reload'; filePath: string }
  | { action: 'unload'; pluginName: string }
  | { action: 'load'; filePath: string }

export async function callCorePlugin(
  log: FastifyInstance['log'],
  user: User,
  botId: number,
  action: CorePluginActionInput,
  options?: { timeoutMs?: number }
): Promise<CorePluginResultPayload> {
  if (!await assertOwnership(user, botId)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Bot not found or not yours.' })
  }

  const { Fastify } = await import('../infra/fastify.js')
  const raw = Fastify.server?.io
  const room = raw?.sockets?.adapter?.rooms?.get(`bot:${botId}`)
  if (room == null || room.size === 0) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Core is offline (no process linked to this bot).' })
  }

  const { getIo } = await import('../infra/socket.js')
  const io = getIo()

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
