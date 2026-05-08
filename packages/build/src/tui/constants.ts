import type { ServiceName, ServiceStatus } from '@/types/index'

export const SERVICE_COLORS = {
  server:    '#5B8DEF',
  daemon:    '#4ADE80',
  dashboard: '#22D3EE',
  node:      '#C084FC',
} as const satisfies Record<ServiceName, string>

export const STATUS_COLORS = {
  idle:    '#666666',
  running: '#4ADE80',
  stopped: '#FBBF24',
  error:   '#EF4444',
} as const satisfies Record<ServiceStatus, string>

export const STATUS_SYMBOLS = {
  idle:    '○',
  running: '●',
  stopped: '◐',
  error:   '✕',
} as const satisfies Record<ServiceStatus, string>

export const PLUGIN_DEBOUNCE_MS = 400
export const MAX_LOG_LINES      = 500
