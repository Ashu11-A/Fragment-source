import type { TypedSocketClient } from './client.js'
import { fragmentSocketContract } from './events.js'

export type FragmentTypedClient = TypedSocketClient<
  typeof fragmentSocketContract.serverToClient,
  typeof fragmentSocketContract.clientToServer
>

export type CoreActivityLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'
export type CoreActivityDisplay = 'success' | 'info' | 'error'

export function inferActivityDisplay(level: CoreActivityLevel, display?: CoreActivityDisplay): CoreActivityDisplay {
  if (display) return display
  if (level === 'error' || level === 'warn') return 'error'
  return 'info'
}

export type CoreActivityPayload = {
  level: CoreActivityLevel
  category: string
  message: string
  display?: CoreActivityDisplay
  metadata?: Record<string, unknown>
  source?: string
  correlationId?: string
}

/**
 * Sends one activity row to the Fragment server (no-op if disconnected).
 * The core must have called `client:identify` so the server can attribute `botId`.
 */
export function reportCoreActivity(client: FragmentTypedClient | undefined | null, payload: CoreActivityPayload): void {
  if (!client?.connected) return

  const display = inferActivityDisplay(payload.level, payload.display)

  client.emit('core:activity:report', {
    level: payload.level,
    category: payload.category,
    message: payload.message,
    display,
    metadata: payload.metadata,
    source: payload.source,
    correlationId: payload.correlationId,
  })
}
