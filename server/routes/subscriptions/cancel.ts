import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Subscription } from '@/database/entity/Subscription.js'
import { Role } from '@/database/enums.js'
import { protectedProcedure } from '@/trpc.js'

export const cancel = protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    const isAdmin = ctx.user.role === Role.Administrator
    const subscription = await Subscription.findOneBy({
      id: input.id,
      user: isAdmin ? undefined : { id: ctx.user.id },
    })
    if (!subscription) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subscription not found or not yours' })

    subscription.active = false
    await subscription.save()

    return { message: 'Subscription cancelled successfully', data: subscription }
  })
