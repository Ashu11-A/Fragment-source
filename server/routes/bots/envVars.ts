import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { botRuntime } from '@/services/BotRuntime.js'
import { findBotForUser } from './shared.js'

const envVarSchema = z.object({
  name: z.string().min(1).max(256),
  value: z.string().max(10_000),
})

export const getBotEnvVarsProcedure = protectedProcedure
  .input(z.object({ botId: z.number().int().positive() }))
  .query(async ({ input, ctx }) => {
    const bot = await findBotForUser(input.botId, ctx.user)
    return {
      envs: bot.envs ?? [],
    }
  })

export const setBotEnvVarsProcedure = protectedProcedure
  .input(z.object({
    botId: z.number().int().positive(),
    envs: z.array(envVarSchema),
  }))
  .mutation(async ({ input, ctx }) => {
    const bot = await findBotForUser(input.botId, ctx.user, ['nodes'])
    bot.envs = input.envs
    await bot.save()
    botRuntime.pushEnvVarsToCore(bot.id, input.envs)
    return { success: true }
  })

export const deleteBotEnvVarProcedure = protectedProcedure
  .input(z.object({
    botId: z.number().int().positive(),
    name: z.string().min(1),
  }))
  .mutation(async ({ input, ctx }) => {
    const bot = await findBotForUser(input.botId, ctx.user)
    bot.envs = (bot.envs ?? []).filter((v) => v.name !== input.name)
    await bot.save()
    return { success: true }
  })
