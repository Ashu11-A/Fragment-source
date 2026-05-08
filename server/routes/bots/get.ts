import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { toTrpcError } from '../_shared/errors.js'
import { findBotForUser } from './shared.js'

const getBotSchema = z.object({
  id: z.number().int().positive(),
})

export const getBotProcedure = protectedProcedure
  .input(getBotSchema)
  .query(async ({ input, ctx }) => {
    try {
      return findBotForUser(input.id, ctx.user, ['nodes', 'plugins', 'user'])
    } catch (error) {
      throw toTrpcError(error, 'Could not fetch bot')
    }
  })
