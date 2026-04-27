import type { TypedSocketClient } from '../client.js'
import { fragmentSocketContract } from '../events.js'

export type FragmentTypedClient = TypedSocketClient<
  typeof fragmentSocketContract.serverToClient,
  typeof fragmentSocketContract.clientToServer
>

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
