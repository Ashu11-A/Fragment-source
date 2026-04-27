export type ActivityLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'
export type ActivityDisplay = 'success' | 'info' | 'error'

export type ActivitySocketPayload = {
  id: number
  botId: number
  level: string
  category: string
  message: string
  display: ActivityDisplay
  metadata?: Record<string, unknown> | null
  source?: string | null
  correlationId?: string | null
  createdAt: string
}

export type ActivityIngest = {
  botId: number
  level: ActivityLevel
  category: string
  message: string
  display?: ActivityDisplay
  metadata?: Record<string, unknown>
  source?: string
  correlationId?: string
}
