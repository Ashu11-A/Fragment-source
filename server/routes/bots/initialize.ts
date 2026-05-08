import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { encryptDiscordToken } from '@/security/discordTokenCipher.js'
import { nodeBridge } from '@/services/NodeBridge.js'
import { botRuntime } from '@/services/BotRuntime.js'
import { billing } from '@/services/Billing.js'
import { baseUrl } from '@/singletons.js'
import { toTrpcError } from '../_shared/errors.js'
import { findBotForUser } from './shared.js'

const initializeBotSchema = z.object({
  botId: z.number().int().positive(),
  nodeId: z.number().int().positive().optional(),
  discordToken: z.string().min(24).max(4096),
})

export const initializeBotProcedure = protectedProcedure
  .input(initializeBotSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const bot = await findBotForUser(input.botId, ctx.user, ['node'])

      const targetNode = bot.node

      if (!targetNode) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Bot has no node assigned. Assign a node before initialization.',
        })
      }

      if (input.nodeId && targetNode.id !== input.nodeId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Requested node does not match the bot assigned node.',
        })
      }

      if (!bot.enabled) {
        const { allowed, limit, current } = await billing.canEnable(ctx.user.id)
        if (!allowed) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `You have reached the maximum number of active bots (${limit}). You currently have ${current} active bot(s). Disable another bot first.`,
          })
        }
        bot.enabled = true
        await bot.save()
      }

      const token = botRuntime.assertToken(input.discordToken)
      bot.token = await encryptDiscordToken(token)
      await bot.save()

      await nodeBridge.initialize(ctx.req.log, targetNode.id, {
        botId: bot.id,
        containerName: botRuntime.containerName(bot.id, targetNode.id),
        tokenFetchUrl: `${baseUrl}/api/node/${targetNode.id}/bots/${bot.id}/token?token=${encodeURIComponent(targetNode.token)}`,
      })

      return findBotForUser(bot.id, ctx.user, ['node', 'plugins', 'user'])
    } catch (error) {
      throw toTrpcError(error, 'Could not initialize bot')
    }
  })
