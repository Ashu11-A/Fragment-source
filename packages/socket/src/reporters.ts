import type { CoreActivityLevel, CoreActivityDisplay, CoreActivityPayload, FragmentTypedClient } from './types/reporters.js'

export type { CoreActivityLevel, CoreActivityDisplay, CoreActivityPayload, FragmentTypedClient } from './types/reporters.js'

export function inferActivityDisplay(level: CoreActivityLevel, display?: CoreActivityDisplay): CoreActivityDisplay {
  if (display) return display
  if (level === 'error' || level === 'warn') return 'error'
  return 'info'
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
