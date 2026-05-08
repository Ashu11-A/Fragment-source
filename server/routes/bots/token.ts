import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { encryptDiscordToken } from '@/security/discordTokenCipher.js'
import { toTrpcError } from '../_shared/errors.js'
import { findBotForUser } from './shared.js'
import { botRuntime } from '@/services/BotRuntime.js'

const setTokenSchema = z.object({
  botId: z.number().int().positive(),
  discordToken: z.string().min(24).max(4096),
})

export const setDiscordTokenProcedure = protectedProcedure
  .input(setTokenSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const bot = await findBotForUser(input.botId, ctx.user)
      const token = botRuntime.assertToken(input.discordToken)
      bot.token = await encryptDiscordToken(token)
      await bot.save()
      return { success: true }
    } catch (error) {
      throw toTrpcError(error, 'Could not save Discord token')
    }
  })
