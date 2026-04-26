import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Subscription } from '@/database/entity/Subscription.js'
import { Role } from '@/database/enums.js'
import { protectedProcedure } from '@/trpc.js'

export const get = protectedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input, ctx }) => {
    const isAdmin = ctx.user.role === Role.Administrator
    const subscription = await Subscription.findOne({
      where: {
        id: input.id,
        user: isAdmin ? undefined : { id: ctx.user.id },
      },
      relations: { user: true, bot: true, plugins: true },
    })
    if (!subscription) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subscription not found' })

    return { message: 'Subscription retrieved successfully', data: subscription }
  })
