import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Subscription } from '@/database/entity/Subscription.js'
import { adminProcedure } from '@/trpc.js'

export const deleteSubscriptionProcedure = adminProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const result = await Subscription.delete({ id: input.id })
    if (result.affected === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subscription not found' })

    return { message: 'Subscription deleted successfully', data: result }
  })
