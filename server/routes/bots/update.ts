import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Node } from '@/database/entity/Node.js'
import { Release } from '@/database/entity/Release.js'
import { botRuntime } from '@/services/BotRuntime.js'
import { nodeBridge } from '@/services/NodeBridge.js'
import { billing } from '@/services/Billing.js'
import { storage, baseUrl } from '@/singletons.js'
import { toTrpcError } from '../_shared/errors.js'
import { findBotForUser } from './shared.js'

const updateBotSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(256).optional(),
  description: z.string().max(10_000).nullable().optional(),
  enabled: z.boolean().optional(),
  nodeId: z.number().int().positive().optional(),
})

export const updateBotProcedure = protectedProcedure
  .input(updateBotSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const bot = await findBotForUser(input.id, ctx.user, ['node'])
      const release = bot.release?.id
        ? await Release.findOne({ where: { id: bot.release.id }, relations: { file: true } })
        : await Release.findOne({ where: { latest: true }, relations: { file: true } })
      const releaseBuffer = release?.file ? await storage.load(release.file.sha256) : undefined
      if (input.name !== undefined) bot.name = input.name
      if (input.description !== undefined) bot.description = input.description
      if (input.enabled !== undefined && input.enabled && !bot.enabled) {
        const { allowed, limit, current } = await billing.canEnable(ctx.user.id)
        if (!allowed) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `You have reached the maximum number of active bots (${limit}). You currently have ${current} active bot(s). Disable another bot first.`,
          })
        }
        bot.enabled = input.enabled
      } else if (input.enabled !== undefined) {
        bot.enabled = input.enabled
      }

      if (input.nodeId !== undefined) {
        const node = await Node.findOne({ where: { id: input.nodeId } })
        if (!node) throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Node not found.',
        })
        bot.node = node
      }

      if (input.enabled !== undefined && bot.node) {
        const action = input.enabled ? 'start' : 'stop'
        ctx.req.log.info({
          botId: bot.id,
          enabled: input.enabled,
          action,
          nodeId: bot.node.id,
        }, '[bots.update] processing bot power action')
        const node = bot.node
        const containerName = botRuntime.containerName(bot.id, node.id)
        ctx.req.log.info({
          botId: bot.id,
          nodeId: node.id,
          action,
          containerName,
        }, '[bots.update] sending node instance action')

        const result = await nodeBridge.action(ctx.req.log, node.id, {
          action,
          botId: bot.id,
          name: containerName,
        })

        if (!result.ok && action === 'start' && result.details?.includes('not tracked')) {
          ctx.req.log.warn({
            botId: bot.id,
            nodeId: node.id,
            action,
            containerName,
            requestId: result.requestId,
            details: result.details,
          }, '[bots.update] node instance missing; creating before start')

          const { plan } = await billing.effectivePlan(ctx.user.id)
          const createResult = await nodeBridge.create(ctx.req.log, node.id, {
            action: 'create',
            botId: bot.id,
            name: containerName,
            startCommand: botRuntime.waitCommand(),
            files: botRuntime.starterFiles(bot.id, releaseBuffer),
            envs: [
              `FRAGMENT_BOT_ID=${bot.id}`,
              `FRAGMENT_LANGUAGE=${ctx.user.language}`,
              `SERVER_URL=${baseUrl}`,
              `FRAGMENT_ACCESS_TOKEN=${(ctx.req.headers.authorization as string | undefined)?.replace(/^Bearer\\s+/i, '').trim() ?? ''}`,
              ...(bot.envs?.map((v: { name: string; value: string }) => `${v.name}=${v.value}`) ?? []),
              ...await botRuntime.collectEnvVars(bot.id),
              ...await botRuntime.collectDefaultEnvVars(bot.id),
            ],
            memoryLimitMb: plan.memory ?? undefined,
          })

          if (!createResult.ok) throw new TRPCError({
            code: 'BAD_REQUEST',
            message: createResult.details ?? createResult.message ?? 'Node failed to create bot instance.',
          })

          ctx.req.log.info({
            botId: bot.id,
            nodeId: node.id,
            action: 'create',
            requestId: createResult.requestId,
            message: createResult.message,
          }, '[bots.update] missing node instance created')
        } else if (!result.ok) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.details ?? result.message ?? `Node failed to ${action} bot instance.`,
          })
        } else {
          ctx.req.log.info({
            botId: bot.id,
            nodeId: node.id,
            action,
            requestId: result.requestId,
            ok: result.ok,
            message: result.message,
            details: result.details,
          }, '[bots.update] node instance action completed')
        }
      }

      await bot.save()

      return findBotForUser(bot.id, ctx.user, ['node', 'plugins', 'user'])
    } catch (error) {
      ctx.req.log.warn({
        botId: input.id,
        enabled: input.enabled,
        error: error instanceof Error ? error.message : String(error),
      }, '[bots.update] failed')
      throw toTrpcError(error, 'Could not update bot')
    }
  })
