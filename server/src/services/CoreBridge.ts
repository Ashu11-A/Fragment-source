import { randomUUID } from 'node:crypto'
import type { User } from '@/database/entity/User.js'
import { activity } from '@/services/Activity.js'
import type { FastifyInstance } from 'fastify'
import { TRPCError } from '@trpc/server'
import type { CorePluginRequest, CorePluginResultPayload, CorePluginActionInput } from '@/types/corePlugin.js'

export type { CorePluginResultPayload, CorePluginActionInput }

type PendingEntry = {
  expectedBotId: number
  resolve: (p: CorePluginResultPayload) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class CoreBridge {
  private readonly pending = new Map<string, PendingEntry>()
  private static readonly TIMEOUT_MS = 30_000

  resolve(identifiedBotId: number | undefined, payload: CorePluginResultPayload): void {
    if (identifiedBotId === undefined) return
    const { requestId } = payload
    const entry = this.pending.get(requestId)
    if (entry == null) return
    if (entry.expectedBotId !== identifiedBotId) return
    clearTimeout(entry.timer)
    this.pending.delete(requestId)
    entry.resolve(payload)
  }

  async call(
    log: FastifyInstance['log'],
    user: User,
    botId: number,
    action: CorePluginActionInput,
    options?: { timeoutMs?: number },
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
    const timeoutMs = options?.timeoutMs ?? CoreBridge.TIMEOUT_MS

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
        if (this.pending.has(requestId)) {
          this.pending.delete(requestId)
          log.warn({ botId, requestId }, '[core:plugin:bridge] timeout')
          reject(new TRPCError({ code: 'TIMEOUT', message: 'Core did not respond in time.' }))
        }
      }, timeoutMs)

      this.pending.set(requestId, {
        expectedBotId: botId,
        resolve: (p) => resolve(p),
        reject: (e) => reject(e),
        timer,
      })

      io.to(`bot:${botId}`).emit('core:plugin:request', request)
    })
  }
}

export const coreBridge = new CoreBridge()
