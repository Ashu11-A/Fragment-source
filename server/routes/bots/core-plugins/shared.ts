import { TRPCError } from '@trpc/server'
import type { CorePluginResultPayload } from '@/types/corePlugin.js'

export function ensureCorePluginSuccess(result: CorePluginResultPayload): CorePluginResultPayload {
  if (!result.ok) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: result.details || result.message || 'Core plugin operation failed.',
    })
  }

  return result
}
