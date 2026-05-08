import { TRPCError } from '@trpc/server'
import { adminProcedure } from '@/trpc.js'
import { Bot } from '@/database/entity/Bot.js'
import { Node } from '@/database/entity/Node.js'
import { assignBotNodeSchema } from './schemas.js'
import { toTrpcError } from '../_shared/errors.js'

export const assignBotNodeProcedure = adminProcedure
  .input(assignBotNodeSchema)
  .mutation(async ({ input }) => {
    try {
      const node = await Node.findOne({ where: { id: input.nodeId }, relations: { bots: true } })
      if (!node) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Node not found.',
      })

      const bot = await Bot.findOne({ where: { id: input.botId } })
      if (!bot) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Bot not found.',
      })

      if (!node.bots.find((assignedBot) => assignedBot.id === bot.id)) {
        node.bots.push(bot)
        await node.save()
      }

      return Node.findOne({ where: { id: node.id }, relations: { bots: true } })
    } catch (error) {
      throw toTrpcError(error, 'Could not assign bot to node')
    }
  })
