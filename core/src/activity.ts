import { reportCoreActivity, type CoreActivityLevel } from 'socket'
import { socket } from './socket.js'

function emit(
  level: CoreActivityLevel,
  category: string,
  message: string,
  opts?: { display?: 'success' | 'info' | 'error'; metadata?: Record<string, unknown>; source?: string },
) {
  reportCoreActivity(socket, {
    level,
    category,
    message,
    display: opts?.display,
    metadata: opts?.metadata,
    source: opts?.source ?? 'core',
  })
}

/**
 * Structured activity / logs forwarded to the Fragment server (realtime dashboard + Pino + DB).
 */
export const coreActivity = {
  trace: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('trace', category, message, { metadata, source: 'core' }),

  debug: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('debug', category, message, { metadata, source: 'core' }),

  info: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('info', category, message, { metadata, source: 'core' }),

  success: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('info', category, message, { display: 'success', metadata, source: 'core' }),

  warn: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('warn', category, message, { metadata, source: 'core' }),

  error: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('error', category, message, { metadata, source: 'core' }),
}
