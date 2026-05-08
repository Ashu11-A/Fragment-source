import type { TypedSocketClient } from '../client.js'
import type { FragmentServerToClient, FragmentClientToServer } from '../contract/index.js'

export type FragmentTypedClient = TypedSocketClient<FragmentServerToClient, FragmentClientToServer>

export type CoreActivityLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'
export type CoreActivityDisplay = 'success' | 'info' | 'error'

export type CoreActivityPayload = {
  level: CoreActivityLevel
  category: string
  message: string
  display?: CoreActivityDisplay
  metadata?: Record<string, unknown>
  source?: string
  correlationId?: string
}
