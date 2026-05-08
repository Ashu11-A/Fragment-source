import { TRPCError } from '@trpc/server'

export function toTrpcError(error: unknown, fallbackMessage: string): TRPCError {
  if (error instanceof TRPCError) {
    return error
  }

  if (error instanceof Error) {
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `${fallbackMessage}: ${error.message}`,
    })
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: fallbackMessage,
  })
}