import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'

export const status = protectedProcedure
  .input(z.object({ ids: z.array(z.number().int().positive()) }))
  .query(async ({ input }) => {
    const { Fastify } = await import('@/infra/fastify.js')
    const io = Fastify.server?.io

    const statuses: Record<number, boolean> = {}
    for (const id of input.ids) {
      const room = io?.sockets.adapter.rooms.get(`bot:${id}`)
      statuses[id] = room ? room.size > 0 : false
    }

    return { message: 'Statuses retrieved successfully!', data: statuses }
  })
