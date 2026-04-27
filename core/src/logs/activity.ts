import { reportCoreActivity, type CoreActivityLevel } from 'socket'
import { socket } from '@/events/socket';

function emit(
  level: CoreActivityLevel,
  category: string,
  message: string,
  opts?: { display?: 'success' | 'info' | 'error'; metadata?: Record<string, unknown> },
) {
  if (socket == null) return
  reportCoreActivity(socket, {
    level,
    category,
    message,
    display: opts?.display,
    metadata: opts?.metadata,
    source: 'core',
  })
}

export const activity = {
  trace: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('trace', category, message, { metadata }),

  debug: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('debug', category, message, { metadata }),

  info: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('info', category, message, { metadata }),

  success: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('info', category, message, { display: 'success', metadata }),

  warn: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('warn', category, message, { metadata }),

  error: (category: string, message: string, metadata?: Record<string, unknown>) =>
    emit('error', category, message, { metadata }),
}
