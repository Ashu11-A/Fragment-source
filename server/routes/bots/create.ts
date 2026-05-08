import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Bot } from '@/database/entity/Bot.js'
import { Node } from '@/database/entity/Node.js'
import { Release } from '@/database/entity/Release.js'
import { botRuntime } from '@/services/BotRuntime.js'
import { nodeBridge } from '@/services/NodeBridge.js'
import { billing } from '@/services/Billing.js'
import { storage, baseUrl } from '@/singletons.js'
import { toTrpcError } from '../_shared/errors.js'

const createBotSchema = z.object({
  name: z.string().min(2).max(256),
  description: z.string().max(10_000).nullable().optional(),
  enabled: z.boolean().default(true),
  nodeId: z.number().int().positive(),
  releaseId: z.number().int().positive().optional(),
})

export const createBotProcedure = protectedProcedure
  .input(createBotSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const release = input.releaseId
        ? await Release.findOne({ where: { id: input.releaseId }, relations: { file: true } })
        : await Release.findOne({ where: { latest: true }, relations: { file: true } })

      if (!release) throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'No release available. Create at least one release before creating bots.',
      })

      const releaseBuffer = release.file ? await storage.load(release.file.sha256) : undefined

      const node = await Node.findOne({ where: { id: input.nodeId } })
      if (!node) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Node not found.',
      })

      const { allowed, limit, current } = await billing.canCreate(ctx.user.id)
      if (!allowed) throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You have reached the maximum number of bots (${limit}). You currently have ${current} bot(s).`,
      })

      const { plan } = await billing.effectivePlan(ctx.user.id)

      const bot = await Bot.create({
        name: input.name,
        description: input.description ?? null,
        enabled: input.enabled,
        user: { id: ctx.user.id },
        release,
        node,
      }).save()

      const nodeInstances: Array<{ nodeId: number; ok: boolean; details?: string }> = []
      try {
        await nodeBridge.create(ctx.req.log, node.id, {
          action: 'create',
          botId: bot.id,
          name: botRuntime.containerName(bot.id, node.id),
          startCommand: botRuntime.waitCommand(),
          files: botRuntime.starterFiles(bot.id, releaseBuffer),
          envs: [
            `FRAGMENT_BOT_ID=${bot.id}`,
            `FRAGMENT_LANGUAGE=${ctx.user.language}`,
            `SERVER_URL=${baseUrl}`,
            `FRAGMENT_ACCESS_TOKEN=${(ctx.req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, '').trim() ?? ''}`,
            ...(bot.envs?.map((v: { name: string; value: string }) => `${v.name}=${v.value}`) ?? []),
            ...await botRuntime.collectDefaultEnvVars(bot.id),
          ],
          memoryLimitMb: plan.memory ?? undefined,
        })
        nodeInstances.push({ nodeId: node.id, ok: true })
      } catch (error) {
        nodeInstances.push({
          nodeId: node.id,
          ok: false,
          details: error instanceof Error ? error.message : 'Failed to create node instance.',
        })
      }

      const createdBot = await Bot.findOne({
        where: { id: bot.id },
        relations: { user: true, node: true, plugins: true },
      })

      return {
        bot: createdBot,
        user: ctx.user,
        nodeInstances,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not create bot')
    }
  })
